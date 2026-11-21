# Standard Library Mastery

## Pathlib for File Operations

```python
from pathlib import Path

# Path creation and manipulation
project_root = Path(__file__).parent.parent
config_file = project_root / "config" / "settings.toml"
data_dir = Path.home() / "data"

# File operations
def read_config(config_path: Path) -> dict[str, str]:
    if not config_path.exists():
        raise FileNotFoundError(f"Config not found: {config_path}")

    # Read text
    content = config_path.read_text(encoding="utf-8")

    # Read bytes
    binary = config_path.read_bytes()

    return parse_config(content)

# Path traversal
def find_python_files(directory: Path) -> list[Path]:
    # Recursive glob
    return list(directory.rglob("*.py"))

def get_file_info(path: Path) -> dict[str, Any]:
    stat = path.stat()
    return {
        "size": stat.st_size,
        "modified": stat.st_mtime,
        "is_file": path.is_file(),
        "is_dir": path.is_dir(),
        "suffix": path.suffix,
        "stem": path.stem,
    }

# Creating directories
def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)

# Temporary files
from tempfile import TemporaryDirectory
from pathlib import Path

def process_with_temp() -> None:
    with TemporaryDirectory() as tmpdir:
        temp_path = Path(tmpdir) / "output.txt"
        temp_path.write_text("data")
```

## Dataclasses for Data Structures

```python
from dataclasses import dataclass, field, asdict, replace
from typing import ClassVar

# Basic dataclass
@dataclass
class User:
    id: int
    name: str
    email: str
    active: bool = True

# Post-init processing
@dataclass
class Product:
    name: str
    price: float
    discount: float = 0.0

    def __post_init__(self) -> None:
        if self.discount > 1.0:
            raise ValueError("Discount must be <= 1.0")

    @property
    def final_price(self) -> float:
        return self.price * (1 - self.discount)

# Field with factory
@dataclass
class ShoppingCart:
    user_id: int
    items: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

# Frozen dataclass (immutable)
@dataclass(frozen=True)
class Point:
    x: float
    y: float

    def distance(self, other: "Point") -> float:
        return ((self.x - other.x)**2 + (self.y - other.y)**2)**0.5

# Class variables
@dataclass
class Config:
    API_VERSION: ClassVar[str] = "v1"
    BASE_URL: ClassVar[str] = "https://api.example.com"

    timeout: int = 30
    retries: int = 3

# Ordered dataclass for comparison
@dataclass(order=True)
class Priority:
    level: int
    name: str = field(compare=False)

# Convert to/from dict
user = User(1, "Alice", "alice@example.com")
user_dict = asdict(user)
updated = replace(user, name="Alice Smith")
```

## Functools for Function Tools

```python
from functools import (
    cache, lru_cache, cached_property,
    partial, wraps, reduce, singledispatch
)

# Caching
@cache  # Unlimited cache (Python 3.9+)
def fibonacci(n: int) -> int:
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

@lru_cache(maxsize=128)  # LRU cache with size limit
def fetch_user(user_id: int) -> dict[str, Any]:
    # Expensive database call
    return {"id": user_id, "name": "User"}

# Cached property
class DataProcessor:
    def __init__(self, data: list[int]) -> None:
        self._data = data

    @cached_property
    def mean(self) -> float:
        """Computed once, then cached."""
        return sum(self._data) / len(self._data)

# Partial application
from operator import mul

double = partial(mul, 2)
triple = partial(mul, 3)
print(double(5))  # 10

# Decorator preservation
def timing_decorator(func: Callable[P, R]) -> Callable[P, R]:
    @wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.time() - start:.2f}s")
        return result
    return wrapper

# Reduce for aggregation
from operator import add

total = reduce(add, [1, 2, 3, 4, 5])  # 15
product = reduce(mul, [1, 2, 3, 4], 1)  # 24

# Single dispatch for polymorphism
@singledispatch
def process(arg: Any) -> str:
    return f"Unknown type: {type(arg)}"

@process.register
def _(arg: int) -> str:
    return f"Integer: {arg * 2}"

@process.register
def _(arg: str) -> str:
    return f"String: {arg.upper()}"

@process.register(list)
def _(arg: list[Any]) -> str:
    return f"List with {len(arg)} items"
```

## Itertools for Iteration

```python
from itertools import (
    chain, islice, cycle, repeat,
    groupby, accumulate, combinations, permutations,
    product, zip_longest, tee, filterfalse
)

# Chain multiple iterables
combined = list(chain([1, 2], [3, 4], [5, 6]))  # [1,2,3,4,5,6]

# Slice iterator (memory efficient)
first_10 = list(islice(range(1000), 10))

# Infinite iterators
from itertools import count
counter = count(start=1, step=2)  # 1, 3, 5, 7, ...

# Groupby for grouping
data = [("A", 1), ("A", 2), ("B", 1), ("B", 2)]
grouped = {k: list(v) for k, v in groupby(data, key=lambda x: x[0])}

# Accumulate for running totals
cumsum = list(accumulate([1, 2, 3, 4, 5]))  # [1, 3, 6, 10, 15]

# Combinations and permutations
combos = list(combinations([1, 2, 3], 2))  # [(1,2), (1,3), (2,3)]
perms = list(permutations([1, 2, 3], 2))  # [(1,2), (1,3), (2,1), ...]

# Cartesian product
pairs = list(product([1, 2], ['a', 'b']))  # [(1,'a'), (1,'b'), (2,'a'), (2,'b')]

# Zip with different lengths
from itertools import zip_longest
paired = list(zip_longest([1, 2], ['a', 'b', 'c'], fillvalue=0))

# Tee for multiple iterators
it1, it2 = tee(range(5), 2)

# Filter false
odds = list(filterfalse(lambda x: x % 2 == 0, range(10)))
```

## Collections for Data Structures

```python
from collections import (
    defaultdict, Counter, deque, namedtuple,
    ChainMap, OrderedDict
)

# defaultdict for automatic defaults
word_index: defaultdict[str, list[int]] = defaultdict(list)
for i, word in enumerate(["hello", "world", "hello"]):
    word_index[word].append(i)

# Counter for counting
from collections import Counter

word_counts = Counter(["apple", "banana", "apple", "cherry", "banana", "apple"])
print(word_counts.most_common(2))  # [('apple', 3), ('banana', 2)]

# Counter operations
c1 = Counter(a=3, b=1)
c2 = Counter(a=1, b=2)
print(c1 + c2)  # Counter({'a': 4, 'b': 3})

# deque for efficient queue operations
from collections import deque

queue: deque[str] = deque()
queue.append("first")
queue.append("second")
queue.appendleft("priority")
item = queue.popleft()  # "priority"

# Ring buffer with maxlen
recent: deque[int] = deque(maxlen=3)
for i in range(5):
    recent.append(i)  # Only keeps last 3

# namedtuple for lightweight classes
from collections import namedtuple

Point = namedtuple('Point', ['x', 'y'])
p = Point(1, 2)
print(p.x, p.y)

# ChainMap for layered configs
from collections import ChainMap

defaults = {'color': 'red', 'user': 'guest'}
environment = {'user': 'admin'}
combined = ChainMap(environment, defaults)
print(combined['user'])  # 'admin' (from environment)
```

## Context Managers

```python
from contextlib import contextmanager, suppress, ExitStack

# Custom context manager
@contextmanager
def managed_resource(resource_id: str) -> Iterator[Resource]:
    resource = acquire_resource(resource_id)
    try:
        yield resource
    finally:
        release_resource(resource)

# Suppress exceptions
with suppress(FileNotFoundError):
    Path("nonexistent.txt").unlink()

# ExitStack for dynamic context managers
def process_files(filenames: list[str]) -> None:
    with ExitStack() as stack:
        files = [stack.enter_context(open(fn)) for fn in filenames]
        # All files auto-closed on exit
        for f in files:
            process(f.read())
```

## Enum for Constants

```python
from enum import Enum, auto, IntEnum, Flag

# Basic enum
class Status(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

# Auto values
class Color(Enum):
    RED = auto()
    GREEN = auto()
    BLUE = auto()

# IntEnum for numeric values
class Priority(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3

# Flag for bit flags
class Permission(Flag):
    READ = auto()
    WRITE = auto()
    EXECUTE = auto()

user_perms = Permission.READ | Permission.WRITE
if Permission.READ in user_perms:
    print("Can read")
```

## Logging

```python
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Structured logging
def process_user(user_id: int) -> None:
    logger.info("Processing user", extra={"user_id": user_id})
    try:
        # Process...
        logger.debug("User data loaded", extra={"user_id": user_id})
    except Exception as e:
        logger.exception("Failed to process user", extra={"user_id": user_id})
```
