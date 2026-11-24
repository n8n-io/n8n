# Type System Mastery

## Basic Type Annotations

```python
from typing import Any
from collections.abc import Sequence, Mapping

# Function signatures
def process_user(name: str, age: int, active: bool = True) -> dict[str, Any]:
    return {"name": name, "age": age, "active": active}

# Use | for unions (Python 3.10+)
def find_user(user_id: int | str) -> dict[str, Any] | None:
    if isinstance(user_id, int):
        return {"id": user_id}
    return None

# Collections - prefer collections.abc
def process_items(items: Sequence[str]) -> list[str]:
    """Accepts list, tuple, or any sequence."""
    return [item.upper() for item in items]

def merge_configs(base: Mapping[str, int], override: dict[str, int]) -> dict[str, int]:
    """Mapping for read-only, dict for mutable."""
    return {**base, **override}
```

## Generic Types

```python
from typing import TypeVar, Generic, Protocol
from collections.abc import Callable

T = TypeVar('T')
K = TypeVar('K')
V = TypeVar('V')

# Generic function
def first_element(items: Sequence[T]) -> T | None:
    return items[0] if items else None

# Generic class
class Cache(Generic[K, V]):
    def __init__(self) -> None:
        self._data: dict[K, V] = {}

    def get(self, key: K) -> V | None:
        return self._data.get(key)

    def set(self, key: K, value: V) -> None:
        self._data[key] = value

# Usage
user_cache: Cache[int, str] = Cache()
user_cache.set(1, "Alice")

# Constrained TypeVar
from numbers import Number
NumT = TypeVar('NumT', bound=Number)

def add_numbers(a: NumT, b: NumT) -> NumT:
    return a + b  # type: ignore[return-value]
```

## Protocol for Structural Typing

```python
from typing import Protocol, runtime_checkable

# Define interface without inheritance
class Drawable(Protocol):
    def draw(self) -> str:
        ...

    @property
    def color(self) -> str:
        ...

class Circle:
    def __init__(self, radius: float, color: str) -> None:
        self.radius = radius
        self._color = color

    def draw(self) -> str:
        return f"Drawing {self._color} circle"

    @property
    def color(self) -> str:
        return self._color

# Circle implements Drawable without inheriting
def render(shape: Drawable) -> str:
    return shape.draw()

# Runtime checkable protocol
@runtime_checkable
class Closeable(Protocol):
    def close(self) -> None:
        ...

def cleanup(resource: Closeable) -> None:
    if isinstance(resource, Closeable):
        resource.close()
```

## Advanced Type Features

```python
from typing import Literal, TypeAlias, TypedDict, NotRequired, Self, overload

# Literal types for constants
Mode = Literal["read", "write", "append"]

def open_file(path: str, mode: Mode) -> None:
    ...

# Type aliases for complex types
JsonDict: TypeAlias = dict[str, Any]
UserId: TypeAlias = int | str

# TypedDict for structured dictionaries
class UserDict(TypedDict):
    id: int
    name: str
    email: str
    age: NotRequired[int]  # Optional field

def create_user(data: UserDict) -> None:
    print(data["name"])  # Type-safe access

# Self type for method chaining
class Builder:
    def __init__(self) -> None:
        self._value = 0

    def add(self, n: int) -> Self:
        self._value += n
        return self

    def multiply(self, n: int) -> Self:
        self._value *= n
        return self

# Overload for different signatures
@overload
def process(data: str) -> str: ...

@overload
def process(data: int) -> int: ...

def process(data: str | int) -> str | int:
    if isinstance(data, str):
        return data.upper()
    return data * 2
```

## Callable Types

```python
from collections.abc import Callable
from typing import ParamSpec, Concatenate

# Basic callable
def apply(func: Callable[[int, int], int], a: int, b: int) -> int:
    return func(a, b)

# ParamSpec for preserving signatures
P = ParamSpec('P')
R = TypeVar('R')

def logging_decorator(func: Callable[P, R]) -> Callable[P, R]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        print(f"Calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

# Concatenate for dependency injection
def with_connection(
    func: Callable[Concatenate[Connection, P], R]
) -> Callable[P, R]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        conn = get_connection()
        return func(conn, *args, **kwargs)
    return wrapper

# Usage
@with_connection
def query_user(conn: Connection, user_id: int) -> User:
    return conn.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

## Mypy Configuration

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_any_generics = true
disallow_subclassing_any = true
disallow_untyped_calls = true
disallow_incomplete_defs = true
check_untyped_defs = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_no_return = true
warn_unreachable = true
strict_equality = true

[[tool.mypy.overrides]]
module = "third_party.*"
ignore_missing_imports = true
```

## Common Type Patterns

```python
# Result type pattern
from dataclasses import dataclass

@dataclass
class Success(Generic[T]):
    value: T

@dataclass
class Error:
    message: str

Result = Success[T] | Error

def divide(a: int, b: int) -> Result[float]:
    if b == 0:
        return Error("Division by zero")
    return Success(a / b)

# Option/Maybe type
def safe_get(items: Sequence[T], index: int) -> T | None:
    try:
        return items[index]
    except IndexError:
        return None

# Sentinel value with typing
from typing import Final

MISSING: Final = object()

def get_value(key: str, default: T | type[MISSING] = MISSING) -> T:
    if default is MISSING:
        raise KeyError(key)
    return default  # type: ignore[return-value]
```

## Type Narrowing

```python
from typing import assert_type, assert_never

def process_value(value: int | str | None) -> str:
    # Type guards
    if value is None:
        return "null"

    if isinstance(value, int):
        # Type narrowed to int
        return str(value * 2)

    # Type narrowed to str
    return value.upper()

# Exhaustiveness checking
def handle_mode(mode: Literal["read", "write"]) -> str:
    if mode == "read":
        return "Reading"
    elif mode == "write":
        return "Writing"
    else:
        # Mypy will error if mode can be anything else
        assert_never(mode)

# Custom type guard
def is_string_list(val: list[Any]) -> bool:
    """Runtime check for list of strings."""
    return all(isinstance(x, str) for x in val)
```
