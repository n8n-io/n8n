# Performance Optimization

---

## Overview

Optimizing pandas performance is critical for production workflows. This reference covers memory optimization, vectorization, chunking, and profiling with pandas 2.0+.

---

## Memory Analysis

### Checking Memory Usage

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    'id': range(1_000_000),
    'name': ['user_' + str(i) for i in range(1_000_000)],
    'category': np.random.choice(['A', 'B', 'C', 'D'], 1_000_000),
    'value': np.random.randn(1_000_000),
    'count': np.random.randint(0, 100, 1_000_000),
})

# Basic memory info
print(df.info(memory_usage='deep'))

# Detailed memory by column
memory_usage = df.memory_usage(deep=True)
print(memory_usage)
print(f"Total: {memory_usage.sum() / 1e6:.2f} MB")

# Memory as percentage of total
memory_pct = (memory_usage / memory_usage.sum() * 100).round(2)
print(memory_pct)
```

### Memory Profiling Function

```python
def memory_profile(df: pd.DataFrame) -> pd.DataFrame:
    """Profile memory usage by column with optimization suggestions."""
    memory_bytes = df.memory_usage(deep=True)

    profile = pd.DataFrame({
        'dtype': df.dtypes,
        'non_null': df.count(),
        'null_count': df.isna().sum(),
        'unique': df.nunique(),
        'memory_mb': (memory_bytes / 1e6).round(3),
    })

    # Add optimization suggestions
    suggestions = []
    for col in df.columns:
        dtype = df[col].dtype
        nunique = df[col].nunique()

        if dtype == 'object':
            if nunique / len(df) < 0.5:  # Less than 50% unique
                suggestions.append(f"Convert to category (only {nunique} unique)")
            else:
                suggestions.append("Consider string dtype")
        elif dtype == 'int64':
            if df[col].max() < 2**31 and df[col].min() >= -2**31:
                suggestions.append("Downcast to int32")
            if df[col].max() < 2**15 and df[col].min() >= -2**15:
                suggestions.append("Downcast to int16")
        elif dtype == 'float64':
            suggestions.append("Consider float32 if precision allows")
        else:
            suggestions.append("OK")

    profile['suggestion'] = suggestions
    return profile

print(memory_profile(df))
```

---

## Memory Optimization Techniques

### Downcasting Numeric Types

```python
# Automatic downcasting for integers
df['count'] = pd.to_numeric(df['count'], downcast='integer')

# Automatic downcasting for floats
df['value'] = pd.to_numeric(df['value'], downcast='float')

# Manual downcasting function
def downcast_dtypes(df: pd.DataFrame) -> pd.DataFrame:
    """Reduce memory by downcasting numeric types."""
    df = df.copy()

    for col in df.select_dtypes(include=['int']).columns:
        df[col] = pd.to_numeric(df[col], downcast='integer')

    for col in df.select_dtypes(include=['float']).columns:
        df[col] = pd.to_numeric(df[col], downcast='float')

    return df

df_optimized = downcast_dtypes(df)
print(f"Before: {df.memory_usage(deep=True).sum() / 1e6:.2f} MB")
print(f"After: {df_optimized.memory_usage(deep=True).sum() / 1e6:.2f} MB")
```

### Using Categorical Type

```python
# Convert low-cardinality string columns to category
# Especially effective when unique values << total rows

# Before
print(f"Object dtype: {df['category'].memory_usage(deep=True) / 1e6:.2f} MB")

# After
df['category'] = df['category'].astype('category')
print(f"Category dtype: {df['category'].memory_usage(deep=True) / 1e6:.2f} MB")

# Automatic conversion for low-cardinality columns
def optimize_categories(df: pd.DataFrame, threshold: float = 0.5) -> pd.DataFrame:
    """Convert object columns to category if unique ratio < threshold."""
    df = df.copy()

    for col in df.select_dtypes(include=['object']).columns:
        unique_ratio = df[col].nunique() / len(df)
        if unique_ratio < threshold:
            df[col] = df[col].astype('category')

    return df
```

### Sparse Data Types

```python
# For data with many repeated values (especially zeros/NaN)
sparse_series = pd.arrays.SparseArray([0, 0, 1, 0, 0, 0, 2, 0, 0, 0])

# Create sparse DataFrame
df_sparse = pd.DataFrame({
    'sparse_col': pd.arrays.SparseArray([0] * 9000 + [1] * 1000),
    'dense_col': [0] * 9000 + [1] * 1000,
})

print(f"Sparse: {df_sparse['sparse_col'].memory_usage() / 1e6:.4f} MB")
print(f"Dense: {df_sparse['dense_col'].memory_usage() / 1e6:.4f} MB")
```

### Nullable Types (pandas 2.0+)

```python
# Use nullable types for proper NA handling with memory efficiency
df = df.astype({
    'id': 'Int32',          # Nullable int32
    'count': 'Int16',       # Nullable int16
    'value': 'Float32',     # Nullable float32
    'name': 'string',       # Nullable string (more memory efficient)
    'category': 'category', # Categorical
})

# Arrow-backed types for even better memory (pandas 2.0+)
df['name'] = df['name'].astype('string[pyarrow]')
df['category'] = df['category'].astype('category')
```

---

## Vectorization

### Replace Loops with Vectorized Operations

```python
# BAD: Row iteration (extremely slow)
result = []
for idx, row in df.iterrows():
    if row['value'] > 0:
        result.append(row['value'] * 2)
    else:
        result.append(0)
df['result'] = result

# GOOD: Vectorized with np.where
df['result'] = np.where(df['value'] > 0, df['value'] * 2, 0)

# GOOD: Vectorized with boolean indexing
df['result'] = 0
df.loc[df['value'] > 0, 'result'] = df.loc[df['value'] > 0, 'value'] * 2
```

### Multiple Conditions with np.select

```python
# BAD: Nested if-else in apply
def categorize(row):
    if row['value'] < -1:
        return 'very_low'
    elif row['value'] < 0:
        return 'low'
    elif row['value'] < 1:
        return 'medium'
    else:
        return 'high'

df['category'] = df.apply(categorize, axis=1)  # SLOW!

# GOOD: Vectorized with np.select
conditions = [
    df['value'] < -1,
    df['value'] < 0,
    df['value'] < 1,
]
choices = ['very_low', 'low', 'medium']
df['category'] = np.select(conditions, choices, default='high')
```

### String Operations - Vectorized

```python
# BAD: Apply for string operations
df['upper_name'] = df['name'].apply(lambda x: x.upper())

# GOOD: Vectorized string methods
df['upper_name'] = df['name'].str.upper()

# Combine multiple string operations
df['processed'] = (
    df['name']
    .str.strip()
    .str.lower()
    .str.replace(r'\s+', '_', regex=True)
)
```

### Avoid apply() When Possible

```python
# BAD: apply for row-wise calculation
df['total'] = df.apply(lambda row: row['a'] + row['b'] + row['c'], axis=1)

# GOOD: Direct vectorized operation
df['total'] = df['a'] + df['b'] + df['c']

# BAD: apply for element-wise operation
df['squared'] = df['value'].apply(lambda x: x ** 2)

# GOOD: Vectorized
df['squared'] = df['value'] ** 2

# When apply IS appropriate: complex custom logic
def complex_calculation(row):
    # Multiple dependencies and conditional logic
    if row['type'] == 'A':
        return row['value'] * row['multiplier'] + row['offset']
    else:
        return row['value'] / row['divisor'] - row['adjustment']

# Consider rewriting as vectorized if performance critical
```

---

## Chunked Processing

### Reading Large Files in Chunks

```python
# Read CSV in chunks
chunk_size = 100_000
chunks = []

for chunk in pd.read_csv('large_file.csv', chunksize=chunk_size):
    # Process each chunk
    processed = chunk[chunk['value'] > 0]  # Filter
    processed = processed.groupby('category')['value'].sum()  # Aggregate
    chunks.append(processed)

# Combine results
result = pd.concat(chunks).groupby(level=0).sum()
```

### Chunked Processing Function

```python
def process_large_csv(
    filepath: str,
    chunk_size: int = 100_000,
    filter_func=None,
    agg_func=None,
) -> pd.DataFrame:
    """Process large CSV files in chunks."""
    results = []

    for chunk in pd.read_csv(filepath, chunksize=chunk_size):
        # Apply filter if provided
        if filter_func:
            chunk = filter_func(chunk)

        # Apply aggregation if provided
        if agg_func:
            chunk = agg_func(chunk)

        results.append(chunk)

    # Combine results
    combined = pd.concat(results, ignore_index=True)

    # Re-aggregate if needed
    if agg_func:
        combined = agg_func(combined)

    return combined

# Usage
result = process_large_csv(
    'large_file.csv',
    chunk_size=50_000,
    filter_func=lambda df: df[df['value'] > 0],
    agg_func=lambda df: df.groupby('category').agg({'value': 'sum'}),
)
```

### Memory-Efficient Iteration

```python
# When you must iterate, use itertuples (not iterrows)
# itertuples is 10-100x faster than iterrows

# BAD: iterrows
for idx, row in df.iterrows():
    process(row['name'], row['value'])

# BETTER: itertuples
for row in df.itertuples():
    process(row.name, row.value)  # Access as attributes

# BEST: Vectorized operations (avoid iteration entirely)
```

---

## Query Optimization

### Efficient Filtering

```python
# Order matters - filter early, compute late
# BAD: Compute on all rows, then filter
df['expensive_calc'] = df['a'] * df['b'] + np.sin(df['c'])
result = df[df['category'] == 'A']

# GOOD: Filter first, compute on subset
mask = df['category'] == 'A'
result = df[mask].copy()
result['expensive_calc'] = result['a'] * result['b'] + np.sin(result['c'])
```

### Using query() for Performance

```python
# query() can be faster for large DataFrames (uses numexpr)
# Traditional boolean indexing
result = df[(df['value'] > 0) & (df['category'] == 'A')]

# query() syntax (faster for large data)
result = df.query('value > 0 and category == "A"')

# With variables
threshold = 0
cat = 'A'
result = df.query('value > @threshold and category == @cat')
```

### eval() for Complex Expressions

```python
# eval() uses numexpr for faster computation
# Standard pandas
df['result'] = df['a'] + df['b'] * df['c'] - df['d']

# Using eval (faster for large DataFrames)
df['result'] = pd.eval('df.a + df.b * df.c - df.d')

# In-place with inplace parameter
df.eval('result = a + b * c - d', inplace=True)
```

---

## GroupBy Optimization

### Pre-sort for Faster GroupBy

```python
# Sort by groupby column first
df = df.sort_values('category')

# Use sort=False since already sorted
result = df.groupby('category', sort=False)['value'].mean()
```

### Use Built-in Aggregations

```python
# BAD: Custom function via apply
result = df.groupby('category')['value'].apply(lambda x: x.mean())

# GOOD: Built-in aggregation
result = df.groupby('category')['value'].mean()

# Built-in aggregations available:
# sum, mean, median, min, max, std, var, count, first, last, nth
# size, sem, prod, cumsum, cummax, cummin, cumprod
```

### Observed Categories

```python
# For categorical columns, use observed=True (pandas 2.0+ default)
df['category'] = df['category'].astype('category')

# Avoid computing for unobserved categories
result = df.groupby('category', observed=True)['value'].mean()
```

---

## I/O Optimization

### Efficient File Formats

```python
# Parquet - best for analytical workloads
df.to_parquet('data.parquet', compression='snappy')
df = pd.read_parquet('data.parquet')

# Feather - best for pandas interchange
df.to_feather('data.feather')
df = pd.read_feather('data.feather')

# CSV with optimizations
df.to_csv('data.csv', index=False)
df = pd.read_csv(
    'data.csv',
    dtype={'category': 'category', 'count': 'int32'},
    usecols=['id', 'category', 'value'],  # Only needed columns
    nrows=10000,  # Limit rows for testing
)
```

### Specify dtypes When Reading

```python
# Specify dtypes upfront to avoid inference overhead
dtypes = {
    'id': 'int32',
    'name': 'string',
    'category': 'category',
    'value': 'float32',
    'count': 'int16',
}

df = pd.read_csv('data.csv', dtype=dtypes)

# Parse dates efficiently
df = pd.read_csv(
    'data.csv',
    dtype=dtypes,
    parse_dates=['date_column'],
    date_format='%Y-%m-%d',  # Explicit format is faster
)
```

---

## Profiling and Benchmarking

### Timing Operations

```python
import time

# Simple timing
start = time.time()
result = df.groupby('category')['value'].mean()
elapsed = time.time() - start
print(f"Elapsed: {elapsed:.4f} seconds")

# Using %%timeit in Jupyter
# %%timeit
# df.groupby('category')['value'].mean()
```

### Memory Profiling

```python
# Track memory before/after
import tracemalloc

tracemalloc.start()

# Your operation
df_result = df.groupby('category').agg({'value': 'sum'})

current, peak = tracemalloc.get_traced_memory()
print(f"Current memory: {current / 1e6:.2f} MB")
print(f"Peak memory: {peak / 1e6:.2f} MB")

tracemalloc.stop()
```

### Comparison Template

```python
def benchmark_operations(df: pd.DataFrame, operations: dict, n_runs: int = 5):
    """Benchmark multiple operations."""
    results = {}

    for name, func in operations.items():
        times = []
        for _ in range(n_runs):
            start = time.time()
            func(df)
            times.append(time.time() - start)

        results[name] = {
            'mean': np.mean(times),
            'std': np.std(times),
            'min': np.min(times),
        }

    return pd.DataFrame(results).T

# Usage
operations = {
    'iterrows': lambda df: [row['value'] for _, row in df.iterrows()],
    'itertuples': lambda df: [row.value for row in df.itertuples()],
    'vectorized': lambda df: df['value'].tolist(),
}

benchmark_results = benchmark_operations(df.head(10000), operations)
print(benchmark_results)
```

---

## Best Practices Summary

1. **Profile first** - Identify actual bottlenecks before optimizing
2. **Use appropriate dtypes** - int32/float32/category save memory
3. **Vectorize everything** - Avoid loops and apply when possible
4. **Filter early** - Reduce data before expensive operations
5. **Chunk large files** - Process in manageable pieces
6. **Use efficient file formats** - Parquet/Feather over CSV
7. **Leverage built-in methods** - Faster than custom functions

---

## Performance Checklist

Before deploying pandas code:

- [ ] Memory profiled with `memory_usage(deep=True)`
- [ ] Dtypes optimized (downcast, categorical)
- [ ] No iterrows/itertuples in hot paths
- [ ] GroupBy uses built-in aggregations
- [ ] Large files processed in chunks
- [ ] Filters applied before computations
- [ ] Appropriate file format used
- [ ] Benchmarked with representative data size

---

## Anti-Patterns Summary

| Anti-Pattern | Alternative |
|--------------|-------------|
| `iterrows()` for computation | Vectorized operations |
| `apply(lambda)` for simple ops | Built-in methods |
| Loading entire large file | Chunked reading |
| String columns with low cardinality | Category dtype |
| int64 for small integers | int32/int16 |
| Multiple separate filters | Combined boolean mask |
| Repeated groupby calls | Single groupby with multiple aggs |

---

## Related References

- `dataframe-operations.md` - Efficient indexing and filtering
- `aggregation-groupby.md` - Optimized aggregation patterns
- `merging-joining.md` - Efficient merge strategies
