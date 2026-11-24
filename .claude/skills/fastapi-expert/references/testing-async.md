# Async Testing

## Test Setup

```python
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.core.deps import get_db
from app.models import Base

# Test database
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"
test_engine = create_async_engine(TEST_DATABASE_URL, echo=True)
test_session = async_sessionmaker(test_engine, expire_on_commit=False)

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="function")
async def db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with test_session() as session:
        yield session
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def client(db: AsyncSession):
    def override_get_db():
        return db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()
```

## Endpoint Tests

```python
@pytest.mark.asyncio
async def test_create_user(client: AsyncClient):
    response = await client.post("/api/v1/users/", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "<test-password>"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "password" not in data

@pytest.mark.asyncio
async def test_get_user_not_found(client: AsyncClient):
    response = await client.get("/api/v1/users/999")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_list_users(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/users/", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

## Auth Helper Fixture

```python
@pytest.fixture
async def test_user(db: AsyncSession) -> User:
    user = User(
        email="auth@test.com",
        username="authuser",
        hashed_password=hash_password("<test-password>"),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@pytest.fixture
async def auth_headers(test_user: User) -> dict:
    token = create_access_token(sub=str(test_user.id))
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_protected_endpoint(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_protected_endpoint_no_auth(client: AsyncClient):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401
```

## Service Tests

```python
@pytest.mark.asyncio
async def test_create_user_service(db: AsyncSession):
    user_in = UserCreate(
        email="service@test.com",
        username="serviceuser",
        password="<test-password>"
    )
    user = await create_user_db(db, user_in)

    assert user.id is not None
    assert user.email == "service@test.com"

@pytest.mark.asyncio
async def test_get_user_not_found_service(db: AsyncSession):
    user = await get_user_db(db, 999)
    assert user is None

@pytest.mark.asyncio
async def test_duplicate_email(db: AsyncSession):
    user_in = UserCreate(email="dup@test.com", username="user1", password="<test-password>")
    await create_user_db(db, user_in)

    with pytest.raises(IntegrityError):
        user_in2 = UserCreate(email="dup@test.com", username="user2", password="<test-password>")
        await create_user_db(db, user_in2)
```

## Mocking Dependencies

```python
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_with_mock_service(client: AsyncClient):
    mock_user = User(id=1, email="mock@test.com", username="mock")

    with patch("app.api.v1.users.get_user_db", new_callable=AsyncMock) as mock:
        mock.return_value = mock_user
        response = await client.get("/api/v1/users/1")
        assert response.status_code == 200
        assert response.json()["email"] == "mock@test.com"
```

## Quick Reference

| Component | Purpose |
|-----------|---------|
| `@pytest.mark.asyncio` | Mark async test |
| `AsyncClient` | HTTP client |
| `ASGITransport(app=app)` | Test transport |
| `app.dependency_overrides` | Override deps |
| `AsyncMock` | Mock async functions |
| `pytest.raises()` | Assert exception |
