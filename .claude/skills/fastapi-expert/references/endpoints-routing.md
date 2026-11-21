# Endpoints & Routing

## Router Setup

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from typing import Annotated

router = APIRouter(prefix="/users", tags=["users"])

# Type aliases for common dependencies
DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
Pagination = Annotated[int, Query(ge=1, le=100)]
```

## CRUD Endpoints

```python
@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(db: DB, user_in: UserCreate) -> User:
    if await get_user_by_email(db, user_in.email):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")
    return await create_user_db(db, user_in)

@router.get("/", response_model=list[UserOut])
async def list_users(
    db: DB,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: Pagination = 20,
) -> list[User]:
    return await get_users(db, skip=skip, limit=limit)

@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    db: DB,
    user_id: Annotated[int, Path(gt=0)],
) -> User:
    user = await get_user_db(db, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user

@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    db: DB,
    user_id: int,
    user_in: UserUpdate,
    current_user: CurrentUser,
) -> User:
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized")
    return await update_user_db(db, user_id, user_in)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(db: DB, user_id: int, current_user: CurrentUser) -> None:
    if not await delete_user_db(db, user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
```

## Custom Dependencies

```python
from fastapi import Depends

async def get_current_active_user(
    current_user: CurrentUser,
) -> User:
    if not current_user.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Inactive user")
    return current_user

ActiveUser = Annotated[User, Depends(get_current_active_user)]

async def require_admin(current_user: CurrentUser) -> User:
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin required")
    return current_user

AdminUser = Annotated[User, Depends(require_admin)]
```

## Query Parameters

```python
@router.get("/search")
async def search_users(
    db: DB,
    q: str = Query(min_length=1, max_length=100),
    is_active: bool | None = None,
    role: UserRole | None = None,
    created_after: datetime | None = None,
    sort_by: Annotated[str, Query(pattern="^(name|email|created_at)$")] = "created_at",
    order: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
) -> list[User]:
    return await search_users_db(db, q, is_active, role, created_after, sort_by, order)
```

## Include Router

```python
# main.py
from fastapi import FastAPI
from app.api.v1 import users, auth, posts

app = FastAPI()

app.include_router(users.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(posts.router, prefix="/api/v1")
```

## Response Models

```python
from fastapi import Response

@router.get("/", response_model=list[UserOut], response_model_exclude_unset=True)
async def list_users(...) -> list[User]:
    ...

@router.get("/{id}", responses={
    200: {"model": UserOut},
    404: {"description": "User not found"},
})
async def get_user(...) -> User:
    ...
```

## Quick Reference

| Decorator | Purpose |
|-----------|---------|
| `@router.get("/")` | GET endpoint |
| `@router.post("/", status_code=201)` | POST with status |
| `Query(ge=0)` | Query param validation |
| `Path(gt=0)` | Path param validation |
| `Depends(func)` | Dependency injection |
| `Annotated[T, Depends()]` | Type alias pattern |
| `response_model=Model` | Response schema |
| `HTTPException(status, detail)` | Error response |
