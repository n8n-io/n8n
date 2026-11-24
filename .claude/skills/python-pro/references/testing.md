# Testing with Pytest

## Basic Pytest Structure

```python
# test_user.py
import pytest
from myapp.user import User, UserService

# Simple test function
def test_user_creation() -> None:
    user = User(id=1, name="Alice", email="alice@example.com")
    assert user.name == "Alice"
    assert user.is_active is True

# Test with multiple assertions
def test_user_validation() -> None:
    with pytest.raises(ValueError, match="Invalid email"):
        User(id=1, name="Alice", email="invalid")

# Test class for grouping
class TestUserService:
    def test_find_user(self) -> None:
        service = UserService()
        user = service.find(1)
        assert user is not None

    def test_create_user(self) -> None:
        service = UserService()
        user = service.create(name="Bob", email="bob@example.com")
        assert user.id > 0
```

## Fixtures for Setup/Teardown

```python
# conftest.py - shared fixtures
import pytest
from typing import Iterator
from myapp.database import Database, Session

@pytest.fixture
def db() -> Iterator[Database]:
    """Provide database instance with cleanup."""
    database = Database("test.db")
    database.create_tables()
    yield database
    database.drop_tables()
    database.close()

@pytest.fixture
def db_session(db: Database) -> Iterator[Session]:
    """Provide database session with rollback."""
    session = db.create_session()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def sample_user() -> User:
    """Provide test user."""
    return User(id=1, name="Test User", email="test@example.com")

# Using fixtures in tests
def test_user_creation(db_session: Session, sample_user: User) -> None:
    db_session.add(sample_user)
    db_session.commit()

    retrieved = db_session.query(User).filter_by(id=1).first()
    assert retrieved.name == "Test User"

# Fixture with parameters
@pytest.fixture(params=["sqlite", "postgresql", "mysql"])
def db_engine(request: pytest.FixtureRequest) -> str:
    return request.param

def test_connection(db_engine: str) -> None:
    # Test runs 3 times with different engines
    assert create_connection(db_engine)

# Autouse fixture (runs automatically)
@pytest.fixture(autouse=True)
def reset_state() -> Iterator[None]:
    """Reset global state before each test."""
    clear_caches()
    yield
    cleanup_temp_files()
```

## Parametrize for Multiple Cases

```python
import pytest

# Parametrize test function
@pytest.mark.parametrize(
    "input,expected",
    [
        (2, 4),
        (3, 9),
        (4, 16),
        (-2, 4),
    ]
)
def test_square(input: int, expected: int) -> None:
    assert square(input) == expected

# Multiple parameters
@pytest.mark.parametrize("base", [2, 10])
@pytest.mark.parametrize("exponent", [0, 1, 2])
def test_power(base: int, exponent: int) -> None:
    result = base ** exponent
    assert result >= 0

# Parametrize with IDs
@pytest.mark.parametrize(
    "email,valid",
    [
        ("user@example.com", True),
        ("invalid", False),
        ("@example.com", False),
        ("user@", False),
    ],
    ids=["valid", "no_at", "no_user", "no_domain"]
)
def test_email_validation(email: str, valid: bool) -> None:
    assert is_valid_email(email) == valid

# Parametrize with fixtures
@pytest.fixture
def user_factory():
    def _make_user(name: str, active: bool = True) -> User:
        return User(name=name, active=active)
    return _make_user

@pytest.mark.parametrize("name", ["Alice", "Bob", "Charlie"])
def test_user_names(user_factory, name: str) -> None:
    user = user_factory(name)
    assert user.name == name
```

## Mocking and Patching

```python
from unittest.mock import Mock, MagicMock, patch, AsyncMock, call
import pytest

# Mock object
def test_api_call_with_mock() -> None:
    mock_client = Mock()
    mock_client.get.return_value = {"status": "ok"}

    service = ApiService(mock_client)
    result = service.fetch_data()

    mock_client.get.assert_called_once_with("/api/data")
    assert result["status"] == "ok"

# Patch function/method
def test_database_call() -> None:
    with patch("myapp.database.connect") as mock_connect:
        mock_connect.return_value = Mock()

        db = Database()
        db.connect()

        mock_connect.assert_called_once()

# Patch as decorator
@patch("myapp.user.send_email")
def test_user_registration(mock_send_email: Mock) -> None:
    service = UserService()
    service.register("user@example.com")

    mock_send_email.assert_called_with(
        to="user@example.com",
        subject="Welcome"
    )

# Multiple patches
@patch("myapp.api.requests.get")
@patch("myapp.api.cache.get")
def test_cached_api(mock_cache: Mock, mock_requests: Mock) -> None:
    mock_cache.return_value = None
    mock_requests.return_value.json.return_value = {"data": "value"}

    result = fetch_with_cache("key")

    mock_cache.assert_called_once_with("key")
    mock_requests.assert_called_once()

# Mock side effects
def test_retry_logic() -> None:
    mock_api = Mock()
    mock_api.call.side_effect = [
        ConnectionError("Failed"),
        ConnectionError("Failed"),
        {"status": "ok"}
    ]

    result = retry_api_call(mock_api)
    assert result["status"] == "ok"
    assert mock_api.call.call_count == 3

# Async mock
@pytest.mark.asyncio
async def test_async_function() -> None:
    mock_db = AsyncMock()
    mock_db.fetch_user.return_value = User(id=1, name="Alice")

    service = AsyncUserService(mock_db)
    user = await service.get_user(1)

    mock_db.fetch_user.assert_awaited_once_with(1)
    assert user.name == "Alice"
```

## Async Testing

```python
import pytest
import asyncio

# Mark async test
@pytest.mark.asyncio
async def test_async_fetch() -> None:
    result = await fetch_data("https://api.example.com")
    assert result["status"] == "ok"

# Async fixture
@pytest.fixture
async def async_db() -> AsyncIterator[AsyncDatabase]:
    db = AsyncDatabase()
    await db.connect()
    yield db
    await db.disconnect()

@pytest.mark.asyncio
async def test_async_query(async_db: AsyncDatabase) -> None:
    result = await async_db.query("SELECT * FROM users")
    assert len(result) > 0

# Test concurrent operations
@pytest.mark.asyncio
async def test_concurrent_requests() -> None:
    urls = ["http://example.com/1", "http://example.com/2"]
    results = await asyncio.gather(*[fetch(url) for url in urls])
    assert len(results) == 2
```

## Pytest Markers

```python
import pytest

# Skip test
@pytest.mark.skip(reason="Not implemented yet")
def test_future_feature() -> None:
    pass

# Conditional skip
@pytest.mark.skipif(sys.version_info < (3, 11), reason="Requires Python 3.11+")
def test_new_feature() -> None:
    pass

# Expected failure
@pytest.mark.xfail(reason="Known bug #123")
def test_known_bug() -> None:
    assert buggy_function() == expected_value

# Custom markers
@pytest.mark.slow
def test_slow_operation() -> None:
    time.sleep(5)
    assert True

@pytest.mark.integration
def test_integration() -> None:
    assert external_service.ping()

# Run with: pytest -m "not slow"
```

## Test Coverage

```python
# Run with coverage
# pytest --cov=myapp --cov-report=html --cov-report=term

# conftest.py - coverage configuration
def pytest_configure(config):
    config.addinivalue_line(
        "markers", "unit: mark test as unit test"
    )

# pytest.ini or pyproject.toml
"""
[tool.pytest.ini_options]
minversion = "7.0"
addopts = [
    "--cov=myapp",
    "--cov-report=term-missing",
    "--cov-fail-under=90",
    "-ra",
    "--strict-markers",
]
testpaths = ["tests"]
"""
```

## Property-Based Testing

```python
from hypothesis import given, strategies as st

# Property-based test
@given(st.integers(), st.integers())
def test_addition_commutative(a: int, b: int) -> None:
    assert a + b == b + a

@given(st.lists(st.integers()))
def test_sorted_is_ordered(lst: list[int]) -> None:
    sorted_lst = sorted(lst)
    for i in range(len(sorted_lst) - 1):
        assert sorted_lst[i] <= sorted_lst[i + 1]

# Custom strategies
@given(st.emails())
def test_email_validation(email: str) -> None:
    assert "@" in email
    assert validate_email(email)

# Composite strategies
from hypothesis import strategies as st
from hypothesis.strategies import composite

@composite
def users(draw) -> User:
    return User(
        id=draw(st.integers(min_value=1)),
        name=draw(st.text(min_size=1, max_size=50)),
        email=draw(st.emails()),
        age=draw(st.integers(min_value=18, max_value=120))
    )

@given(users())
def test_user_creation(user: User) -> None:
    assert user.age >= 18
    assert len(user.name) > 0
```

## Test Organization

```python
# tests/
#   conftest.py          - Shared fixtures
#   test_user.py         - User tests
#   test_api.py          - API tests
#   integration/
#     test_workflow.py   - Integration tests
#   unit/
#     test_models.py     - Unit tests

# Fixture factory pattern
@pytest.fixture
def user_factory(db_session: Session):
    created_users: list[User] = []

    def _create_user(
        name: str = "Test User",
        email: str | None = None,
        **kwargs
    ) -> User:
        if email is None:
            email = f"{name.lower().replace(' ', '.')}@example.com"

        user = User(name=name, email=email, **kwargs)
        db_session.add(user)
        db_session.commit()
        created_users.append(user)
        return user

    yield _create_user

    # Cleanup
    for user in created_users:
        db_session.delete(user)
    db_session.commit()
```

## Snapshot Testing

```python
import pytest
from syrupy.assertion import SnapshotAssertion

def test_api_response(snapshot: SnapshotAssertion) -> None:
    response = api.get_user(1)
    assert response == snapshot

def test_rendered_template(snapshot: SnapshotAssertion) -> None:
    html = render_template("user.html", user=get_user(1))
    assert html == snapshot
```
