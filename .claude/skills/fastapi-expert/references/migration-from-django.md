# Django to FastAPI Migration Guide

---

## When to Use This Guide

**Migrate to FastAPI when:**
- Need async/await for I/O-bound operations
- Require WebSocket or Server-Sent Events
- Want automatic OpenAPI/Swagger documentation
- Need better performance for API-heavy workloads
- Desire modern Python type hints and editor support
- Building microservices from Django monolith
- Require lower resource consumption

**DO NOT migrate when:**
- Heavy use of Django admin interface
- Extensive Django ORM model inheritance
- Complex form handling and validation
- Server-side template rendering required
- Team lacks async Python experience
- Django ecosystem plugins are critical
- Migration cost exceeds business value

---

## Concept Mapping: Django/DRF → FastAPI

| Django/DRF Concept | FastAPI Equivalent | Notes |
|-------------------|-------------------|-------|
| `models.Model` | Pydantic `BaseModel` + SQLAlchemy | Separate schema from ORM |
| `serializers.Serializer` | Pydantic `BaseModel` | Type-safe validation |
| `ModelSerializer` | Multiple Pydantic models | Create/Read/Update schemas |
| `ViewSet` | `APIRouter` + path operations | More explicit routing |
| `GenericAPIView` | Dependency injection | Function-based approach |
| `@api_view` decorator | `@router.get/post` | Built-in HTTP methods |
| `urls.py` | `APIRouter` + `app.include_router` | Nested routers |
| `settings.py` | `pydantic-settings` | Environment-based config |
| `middleware` | Middleware + dependencies | More granular control |
| `permissions` | Dependencies | Composable auth |
| `authentication` | OAuth2 + JWT dependencies | Standards-based |
| `pagination` | Query parameters + dependencies | Manual implementation |
| `filters` | Query parameters | Type-safe filtering |
| `Django ORM` | SQLAlchemy 2.0+ | Async support |
| `select_related` | `selectinload` | Eager loading |
| `prefetch_related` | `joinedload` | Join strategies |
| `pytest-django` | `pytest + httpx` | Async test client |
| `admin.py` | External (SQLAdmin, etc.) | Not built-in |

---

## Serializer → Pydantic V2 Migration

### Django REST Framework Serializer

```python
# Django DRF
from rest_framework import serializers
from .models import User, Post

class UserSerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'created_at', 'post_count']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'email': {'write_only': True}
        }

    def get_post_count(self, obj):
        return obj.posts.count()

    def validate_username(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("Username too short")
        return value

class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    tags = serializers.ListField(child=serializers.CharField())

    class Meta:
        model = Post
        fields = ['id', 'title', 'content', 'author', 'tags', 'published']

    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        post = Post.objects.create(**validated_data)
        post.tags.set(tags)
        return post
```

### FastAPI Pydantic V2 Schemas

```python
# FastAPI with Pydantic V2
from pydantic import BaseModel, EmailStr, Field, field_validator, computed_field
from datetime import datetime
from typing import Annotated

# Base schemas
class UserBase(BaseModel):
    username: Annotated[str, Field(min_length=3, max_length=50)]
    email: EmailStr

# Create schema (input)
class UserCreate(UserBase):
    password: Annotated[str, Field(min_length=8)]

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        if len(v) < 3:
            raise ValueError("Username too short")
        return v

# Update schema (partial)
class UserUpdate(BaseModel):
    username: Annotated[str | None, Field(min_length=3, max_length=50)] = None
    email: EmailStr | None = None

# Read schema (output) - analogous to read_only_fields
class UserRead(UserBase):
    id: int
    created_at: datetime

    model_config = {
        "from_attributes": True  # Pydantic V2: replaces orm_mode
    }

# Read schema with relations - analogous to SerializerMethodField
class UserReadWithStats(UserRead):
    post_count: int

    @computed_field  # Pydantic V2 computed fields
    @property
    def display_name(self) -> str:
        return f"@{self.username}"

# Nested schemas
class PostBase(BaseModel):
    title: Annotated[str, Field(max_length=200)]
    content: str
    tags: list[str] = []
    published: bool = False

class PostCreate(PostBase):
    pass

class PostRead(PostBase):
    id: int
    author: UserRead  # Nested serialization
    created_at: datetime

    model_config = {"from_attributes": True}

# Embedding vs side-loading
class PostReadMinimal(BaseModel):
    """Minimal post representation (just ID)"""
    id: int
    title: str
    author_id: int  # Side-loaded reference

    model_config = {"from_attributes": True}
```

---

## ViewSet → APIRouter Migration

### Django REST Framework ViewSet

```python
# Django DRF ViewSet
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_authenticated:
            return queryset.filter(author=self.request.user)
        return queryset.none()

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        post = self.get_object()
        post.published = True
        post.save()
        return Response({'status': 'published'})

    @action(detail=False, methods=['get'])
    def recent(self, request):
        recent_posts = self.get_queryset().order_by('-created_at')[:10]
        serializer = self.get_serializer(recent_posts, many=True)
        return Response(serializer.data)
```

### FastAPI APIRouter with Dependencies

```python
# FastAPI APIRouter
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated

from .database import get_db
from .auth import get_current_user
from .models import Post as PostModel, User as UserModel
from .schemas import PostRead, PostCreate, PostUpdate, UserRead

router = APIRouter(prefix="/posts", tags=["posts"])

# Dependency for database session
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[UserModel, Depends(get_current_user)]

# List posts (GET /posts)
@router.get("/", response_model=list[PostRead])
async def list_posts(
    db: DbSession,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
):
    """Analogous to ViewSet.list()"""
    result = await db.execute(
        select(PostModel)
        .where(PostModel.author_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    posts = result.scalars().all()
    return posts

# Create post (POST /posts)
@router.post("/", response_model=PostRead, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    """Analogous to ViewSet.create()"""
    post = PostModel(**post_data.model_dump(), author_id=current_user.id)
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post

# Retrieve single post (GET /posts/{post_id})
@router.get("/{post_id}", response_model=PostRead)
async def get_post(
    post_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    """Analogous to ViewSet.retrieve()"""
    result = await db.execute(
        select(PostModel).where(
            PostModel.id == post_id,
            PostModel.author_id == current_user.id
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

# Update post (PUT /posts/{post_id})
@router.put("/{post_id}", response_model=PostRead)
async def update_post(
    post_id: int,
    post_data: PostUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    """Analogous to ViewSet.update()"""
    result = await db.execute(
        select(PostModel).where(
            PostModel.id == post_id,
            PostModel.author_id == current_user.id
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Update only provided fields
    for field, value in post_data.model_dump(exclude_unset=True).items():
        setattr(post, field, value)

    await db.commit()
    await db.refresh(post)
    return post

# Delete post (DELETE /posts/{post_id})
@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    """Analogous to ViewSet.destroy()"""
    result = await db.execute(
        select(PostModel).where(
            PostModel.id == post_id,
            PostModel.author_id == current_user.id
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    await db.delete(post)
    await db.commit()

# Custom action: Publish (POST /posts/{post_id}/publish)
@router.post("/{post_id}/publish", response_model=dict)
async def publish_post(
    post_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    """Analogous to @action(detail=True)"""
    result = await db.execute(
        select(PostModel).where(
            PostModel.id == post_id,
            PostModel.author_id == current_user.id
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    post.published = True
    await db.commit()
    return {"status": "published"}

# Custom collection action: Recent posts (GET /posts/recent)
@router.get("/actions/recent", response_model=list[PostRead])
async def recent_posts(
    db: DbSession,
    current_user: CurrentUser,
    limit: int = Query(10, le=50),
):
    """Analogous to @action(detail=False)"""
    result = await db.execute(
        select(PostModel)
        .where(PostModel.author_id == current_user.id)
        .order_by(PostModel.created_at.desc())
        .limit(limit)
    )
    posts = result.scalars().all()
    return posts
```

---

## Django ORM → Async SQLAlchemy

### Django ORM Models

```python
# Django models
from django.db import models

class User(models.Model):
    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['username']),
        ]

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    created_at = models.DateTimeField(auto_now_add=True)
    published = models.BooleanField(default=False)

    class Meta:
        db_table = 'posts'
        ordering = ['-created_at']
```

### SQLAlchemy 2.0 Async Models

```python
# SQLAlchemy 2.0 models
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Boolean, ForeignKey, Index
from datetime import datetime
from typing import List

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = 'users'

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True)

    # Columns with type hints
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relationships (analogous to related_name)
    posts: Mapped[List["Post"]] = relationship(back_populates="author")

    __table_args__ = (
        Index('ix_users_username', 'username'),
    )

class Post(Base):
    __tablename__ = 'posts'

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    author_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    published: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationship
    author: Mapped["User"] = relationship(back_populates="posts")

    __table_args__ = (
        Index('ix_posts_created_at', 'created_at'),
    )
```

### Query Patterns: Django ORM vs SQLAlchemy

```python
# Django ORM queries
from django.db.models import Count, Q

# Simple filter
posts = Post.objects.filter(published=True)

# Select related (JOIN)
posts = Post.objects.select_related('author').filter(published=True)

# Prefetch related (separate query)
users = User.objects.prefetch_related('posts').all()

# Complex filtering
posts = Post.objects.filter(
    Q(published=True) | Q(author__username='admin')
).order_by('-created_at')[:10]

# Aggregation
user_stats = User.objects.annotate(
    post_count=Count('posts')
).filter(post_count__gte=5)
```

```python
# SQLAlchemy 2.0 async queries
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload, joinedload

# Simple filter
async def get_published_posts(db: AsyncSession):
    result = await db.execute(
        select(Post).where(Post.published == True)
    )
    return result.scalars().all()

# Eager loading with JOIN (selectinload = separate query)
async def get_posts_with_authors(db: AsyncSession):
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.author))
        .where(Post.published == True)
    )
    return result.scalars().all()

# Prefetch related (joinedload = single query with JOIN)
async def get_users_with_posts(db: AsyncSession):
    result = await db.execute(
        select(User).options(joinedload(User.posts))
    )
    return result.unique().scalars().all()

# Complex filtering
async def get_complex_posts(db: AsyncSession):
    result = await db.execute(
        select(Post)
        .join(Post.author)
        .where(
            or_(
                Post.published == True,
                User.username == 'admin'
            )
        )
        .order_by(Post.created_at.desc())
        .limit(10)
    )
    return result.scalars().all()

# Aggregation
async def get_user_stats(db: AsyncSession):
    result = await db.execute(
        select(User, func.count(Post.id).label('post_count'))
        .join(Post)
        .group_by(User.id)
        .having(func.count(Post.id) >= 5)
    )
    return result.all()
```

---

## Authentication: SimpleJWT → FastAPI JWT

### Django SimpleJWT

```python
# Django settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}

# Views
from rest_framework_simplejwt.views import TokenObtainPairView

# Usage in ViewSet
from rest_framework.permissions import IsAuthenticated

class ProtectedViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Post.objects.filter(author=self.request.user)
```

### FastAPI JWT Authentication

```python
# auth.py - FastAPI JWT implementation
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Annotated

# Configuration
SECRET_KEY = "<jwt-secret>"  # Use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Dependency: Get current user from token
async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> UserModel:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception

    result = await db.execute(
        select(UserModel).where(UserModel.username == token_data.username)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user

# Login endpoint
auth_router = APIRouter(prefix="/auth", tags=["auth"])

@auth_router.post("/token", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    # Authenticate user
    result = await db.execute(
        select(UserModel).where(UserModel.username == form_data.username)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Protected endpoint usage
@router.get("/protected")
async def protected_route(current_user: Annotated[UserModel, Depends(get_current_user)]):
    return {"message": f"Hello {current_user.username}"}
```

---

## Testing Migration

### Django/DRF Tests

```python
# Django pytest
import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user(db):
    return User.objects.create_user(username='test', password='<test-password>')

@pytest.mark.django_db
def test_create_post(api_client, user):
    api_client.force_authenticate(user=user)
    response = api_client.post('/api/posts/', {
        'title': 'Test Post',
        'content': 'Test content'
    })
    assert response.status_code == 201
    assert response.data['title'] == 'Test Post'
```

### FastAPI Tests

```python
# FastAPI pytest with httpx
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.main import app
from app.database import get_db, Base
from app.models import User

# Test database setup
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest.fixture
async def db_session(db_engine):
    async_session = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session

@pytest.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()

@pytest.fixture
async def auth_headers(client, db_session):
    # Create test user
    user = User(username="test", email="test@example.com")
    user.hashed_password = get_password_hash("<test-password>")
    db_session.add(user)
    await db_session.commit()

    # Get token
    response = await client.post("/auth/token", data={
        "username": "test",
        "password": "<test-password>"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_create_post(client, auth_headers):
    response = await client.post(
        "/posts/",
        json={"title": "Test Post", "content": "Test content"},
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Post"

@pytest.mark.asyncio
async def test_list_posts(client, auth_headers, db_session):
    # Create test data
    user = await db_session.execute(select(User).where(User.username == "test"))
    user = user.scalar_one()

    post = Post(title="Test", content="Content", author_id=user.id)
    db_session.add(post)
    await db_session.commit()

    # Test endpoint
    response = await client.get("/posts/", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
```

---

## Incremental Migration Strategy

### Phase 1: Parallel API (Strangler Pattern)

Run Django and FastAPI side-by-side, migrating endpoints incrementally.

```python
# Nginx routing config
location /api/v2/ {
    proxy_pass http://fastapi:8000;
}

location /api/ {
    proxy_pass http://django:8001;
}
```

**Approach:**
1. Stand up FastAPI with shared database (read-only initially)
2. Migrate GET endpoints first (lowest risk)
3. Add write endpoints with dual-write to both systems
4. Validate data consistency
5. Switch traffic gradually (feature flags)

### Phase 2: Shared Database Migration

```python
# FastAPI with existing Django database
from sqlalchemy import MetaData

# Reflect existing Django tables
metadata = MetaData()
metadata.reflect(bind=engine, only=['users', 'posts'])

# Or define models matching Django schema
class User(Base):
    __tablename__ = 'auth_user'  # Django's user table
    # Map to Django's column names
```

### Phase 3: Database Schema Modernization

After traffic migration, modernize schema:
- Remove Django-specific fields (`content_type`, `permissions`)
- Simplify table names (remove app prefixes)
- Add database-level constraints
- Optimize indexes for async queries

### Phase 4: Complete Cutover

```python
# Decommission Django
# 1. Archive Django admin usage
# 2. Export management commands to FastAPI CLI
# 3. Migrate background tasks to Celery/Dramatiq
# 4. Remove Django dependency
```

---

## Common Pitfalls

### 1. Async/Await Mistakes

**WRONG:**
```python
# Blocking call in async function
@router.get("/users")
async def get_users(db: AsyncSession):
    users = db.execute(select(User)).scalars().all()  # Missing await
    return users
```

**CORRECT:**
```python
@router.get("/users")
async def get_users(db: AsyncSession):
    result = await db.execute(select(User))  # Await async operation
    users = result.scalars().all()
    return users
```

### 2. Missing `from_attributes` (orm_mode)

**WRONG:**
```python
class UserRead(BaseModel):
    id: int
    username: str
    # Missing config - won't work with SQLAlchemy models
```

**CORRECT:**
```python
class UserRead(BaseModel):
    id: int
    username: str

    model_config = {"from_attributes": True}  # Pydantic V2
```

### 3. Session Management

**WRONG:**
```python
# Reusing session across requests
db_session = async_sessionmaker(engine)()

@router.get("/users")
async def get_users():
    return await db_session.execute(select(User))  # Session leak
```

**CORRECT:**
```python
# Dependency injection per request
async def get_db():
    async with async_sessionmaker(engine)() as session:
        yield session
        await session.commit()

@router.get("/users")
async def get_users(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(User))
    return result.scalars().all()
```

### 4. Relationship Loading

**WRONG:**
```python
# Lazy loading in async (causes errors)
user = await db.get(User, user_id)
posts = user.posts  # Error: lazy loading not supported in async
```

**CORRECT:**
```python
# Eager loading with selectinload
result = await db.execute(
    select(User).options(selectinload(User.posts)).where(User.id == user_id)
)
user = result.scalar_one()
posts = user.posts  # Already loaded
```

### 5. Transaction Handling

**WRONG:**
```python
# Auto-commit not configured
@router.post("/users")
async def create_user(user: UserCreate, db: AsyncSession):
    db_user = User(**user.dict())
    db.add(db_user)
    # Missing commit - changes lost
    return db_user
```

**CORRECT:**
```python
@router.post("/users")
async def create_user(user: UserCreate, db: AsyncSession):
    db_user = User(**user.model_dump())
    db.add(db_user)
    await db.commit()  # Explicit commit
    await db.refresh(db_user)  # Refresh to get DB-generated fields
    return db_user
```

---

## Cross-Reference

For comprehensive migration strategies and modernization patterns:
- **Legacy Modernizer**: `../legacy-modernizer/references/migration-strategies.md`
  - Strangler pattern implementation
  - Feature flag strategies
  - Rollback procedures
  - Data migration pipelines

---

## Migration Checklist

**Pre-Migration:**
- [ ] Async readiness assessment (I/O bound workload?)
- [ ] Team async Python experience validated
- [ ] Database compatibility verified (async drivers available)
- [ ] Admin interface replacement identified
- [ ] Migration timeline approved (6-12 months realistic)

**During Migration:**
- [ ] Parallel deployment configured
- [ ] Monitoring and alerting set up
- [ ] Load testing completed
- [ ] Data consistency validation automated
- [ ] Rollback procedure tested

**Post-Migration:**
- [ ] Django dependencies removed
- [ ] Documentation updated
- [ ] Team training completed
- [ ] Performance gains measured
- [ ] Cost savings validated

---

**Key Takeaway:** Migrate incrementally. Start with read-heavy endpoints, validate thoroughly, then gradually move write operations. Always maintain rollback capability.