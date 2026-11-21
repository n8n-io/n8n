# Merging and Joining

---

## Overview

Combining DataFrames is essential for working with relational data. This reference covers merge, join, concat, and advanced combination strategies with pandas 2.0+.

---

## Merge (SQL-Style Joins)

### Basic Merge

```python
import pandas as pd
import numpy as np

# Sample DataFrames
employees = pd.DataFrame({
    'emp_id': [1, 2, 3, 4, 5],
    'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
    'dept_id': [101, 102, 101, 103, 102],
})

departments = pd.DataFrame({
    'dept_id': [101, 102, 104],
    'dept_name': ['Engineering', 'Sales', 'Marketing'],
})

# Inner join (default) - only matching rows
result = pd.merge(employees, departments, on='dept_id')

# Explicit how parameter
result = pd.merge(employees, departments, on='dept_id', how='inner')
```

### Join Types

```python
# Inner join - only matching rows from both
inner = pd.merge(employees, departments, on='dept_id', how='inner')
# Result: 4 rows (emp_id 4 has dept_id 103 which doesn't exist in departments)

# Left join - all rows from left, matching from right
left = pd.merge(employees, departments, on='dept_id', how='left')
# Result: 5 rows (Diana has NaN for dept_name)

# Right join - all rows from right, matching from left
right = pd.merge(employees, departments, on='dept_id', how='right')
# Result: 4 rows (Marketing has no employees, but is included)

# Outer join - all rows from both
outer = pd.merge(employees, departments, on='dept_id', how='outer')
# Result: 6 rows (includes unmatched from both sides)

# Cross join - cartesian product
cross = pd.merge(employees, departments, how='cross')
# Result: 15 rows (5 employees x 3 departments)
```

### Merging on Different Column Names

```python
employees = pd.DataFrame({
    'emp_id': [1, 2, 3],
    'name': ['Alice', 'Bob', 'Charlie'],
    'department': [101, 102, 101],
})

departments = pd.DataFrame({
    'id': [101, 102],
    'dept_name': ['Engineering', 'Sales'],
})

# Different column names
result = pd.merge(
    employees,
    departments,
    left_on='department',
    right_on='id'
)

# Drop duplicate column after merge
result = result.drop('id', axis=1)
```

### Merging on Multiple Columns

```python
sales = pd.DataFrame({
    'region': ['East', 'East', 'West', 'West'],
    'product': ['A', 'B', 'A', 'B'],
    'sales': [100, 150, 120, 180],
})

targets = pd.DataFrame({
    'region': ['East', 'East', 'West'],
    'product': ['A', 'B', 'A'],
    'target': [90, 140, 110],
})

# Merge on multiple columns
result = pd.merge(sales, targets, on=['region', 'product'], how='left')
```

### Merging on Index

```python
# Set index before merge
employees_idx = employees.set_index('emp_id')
salaries = pd.DataFrame({
    'emp_id': [1, 2, 3, 4],
    'salary': [80000, 75000, 70000, 65000],
}).set_index('emp_id')

# Merge on index
result = pd.merge(employees_idx, salaries, left_index=True, right_index=True)

# Mix of column and index
result = pd.merge(
    employees,
    salaries,
    left_on='emp_id',
    right_index=True
)
```

---

## Handling Duplicate Columns

### Suffixes

```python
df1 = pd.DataFrame({
    'id': [1, 2, 3],
    'value': [10, 20, 30],
    'date': ['2024-01-01', '2024-01-02', '2024-01-03'],
})

df2 = pd.DataFrame({
    'id': [1, 2, 3],
    'value': [100, 200, 300],
    'date': ['2024-02-01', '2024-02-02', '2024-02-03'],
})

# Default suffixes
result = pd.merge(df1, df2, on='id')
# Columns: id, value_x, date_x, value_y, date_y

# Custom suffixes
result = pd.merge(df1, df2, on='id', suffixes=('_jan', '_feb'))
# Columns: id, value_jan, date_jan, value_feb, date_feb
```

### Validate Merge Cardinality

```python
# Validate merge relationships (pandas 2.0+)
# Raises MergeError if validation fails

# One-to-one: each key appears at most once in both DataFrames
result = pd.merge(df1, df2, on='id', validate='one_to_one')  # or '1:1'

# One-to-many: keys unique in left only
result = pd.merge(employees, salaries, on='emp_id', validate='one_to_many')  # or '1:m'

# Many-to-one: keys unique in right only
result = pd.merge(salaries, employees, on='emp_id', validate='many_to_one')  # or 'm:1'

# Many-to-many: no uniqueness requirement (default)
result = pd.merge(df1, df2, on='id', validate='many_to_many')  # or 'm:m'
```

### Indicator Column

```python
# Add indicator column showing source of each row
result = pd.merge(
    employees,
    departments,
    on='dept_id',
    how='outer',
    indicator=True
)
# _merge column values: 'left_only', 'right_only', 'both'

# Custom indicator name
result = pd.merge(
    employees,
    departments,
    on='dept_id',
    how='outer',
    indicator='source'
)

# Filter by indicator
left_only = result[result['_merge'] == 'left_only']
both = result[result['_merge'] == 'both']
```

---

## Join (Index-Based)

### DataFrame.join()

```python
# join() is for index-based joining (simpler syntax)
employees = pd.DataFrame({
    'name': ['Alice', 'Bob', 'Charlie'],
    'dept_id': [101, 102, 101],
}, index=[1, 2, 3])

salaries = pd.DataFrame({
    'salary': [80000, 75000, 70000],
    'bonus': [5000, 4000, 3500],
}, index=[1, 2, 3])

# Join on index
result = employees.join(salaries)

# Join types (same as merge)
result = employees.join(salaries, how='left')
result = employees.join(salaries, how='outer')
```

### Join on Column to Index

```python
employees = pd.DataFrame({
    'name': ['Alice', 'Bob', 'Charlie'],
    'dept_id': [101, 102, 101],
})

departments = pd.DataFrame({
    'dept_name': ['Engineering', 'Sales'],
}, index=[101, 102])

# Join left column to right index
result = employees.join(departments, on='dept_id')
```

### Join Multiple DataFrames

```python
df1 = pd.DataFrame({'a': [1, 2]}, index=['x', 'y'])
df2 = pd.DataFrame({'b': [3, 4]}, index=['x', 'y'])
df3 = pd.DataFrame({'c': [5, 6]}, index=['x', 'y'])

# Join multiple at once
result = df1.join([df2, df3])

# With suffixes for duplicate columns
result = df1.join([df2, df3], lsuffix='_1', rsuffix='_2')
```

---

## Concat (Stacking DataFrames)

### Vertical Concatenation (Row-wise)

```python
# Stack DataFrames vertically
df1 = pd.DataFrame({
    'name': ['Alice', 'Bob'],
    'age': [25, 30],
})

df2 = pd.DataFrame({
    'name': ['Charlie', 'Diana'],
    'age': [35, 28],
})

# Basic concat (axis=0 is default)
result = pd.concat([df1, df2])

# Reset index
result = pd.concat([df1, df2], ignore_index=True)

# Keep track of source
result = pd.concat([df1, df2], keys=['source1', 'source2'])
# Creates MultiIndex
```

### Horizontal Concatenation (Column-wise)

```python
names = pd.DataFrame({'name': ['Alice', 'Bob', 'Charlie']})
ages = pd.DataFrame({'age': [25, 30, 35]})
salaries = pd.DataFrame({'salary': [50000, 60000, 70000]})

# Concat columns (axis=1)
result = pd.concat([names, ages, salaries], axis=1)
```

### Handling Mismatched Columns

```python
df1 = pd.DataFrame({
    'name': ['Alice', 'Bob'],
    'age': [25, 30],
})

df2 = pd.DataFrame({
    'name': ['Charlie', 'Diana'],
    'salary': [70000, 65000],
})

# Outer join (default) - include all columns
result = pd.concat([df1, df2])
# age and salary columns have NaN where not present

# Inner join - only common columns
result = pd.concat([df1, df2], join='inner')
# Only 'name' column
```

### Concat with Verification

```python
# Verify no index overlap
try:
    result = pd.concat([df1, df2], verify_integrity=True)
except ValueError as e:
    print(f"Index overlap detected: {e}")

# Alternative: use ignore_index
result = pd.concat([df1, df2], ignore_index=True)
```

---

## Combine and Update

### combine_first() - Fill Gaps

```python
# Fill NaN values from another DataFrame
df1 = pd.DataFrame({
    'A': [1, np.nan, 3],
    'B': [np.nan, 2, 3],
}, index=['a', 'b', 'c'])

df2 = pd.DataFrame({
    'A': [10, 20, 30],
    'B': [10, 20, 30],
}, index=['a', 'b', 'c'])

# Fill NaN in df1 with values from df2
result = df1.combine_first(df2)
# A: [1, 20, 3], B: [10, 2, 3]
```

### update() - In-Place Update

```python
df1 = pd.DataFrame({
    'A': [1, 2, 3],
    'B': [4, 5, 6],
}, index=['a', 'b', 'c'])

df2 = pd.DataFrame({
    'A': [10, 20],
    'B': [40, 50],
}, index=['a', 'b'])

# Update df1 with values from df2 (in-place)
df1.update(df2)
# df1 now has A: [10, 20, 3], B: [40, 50, 6]

# Only update where df2 has non-NaN
df1.update(df2, overwrite=False)  # Don't overwrite existing values
```

---

## Advanced Merge Patterns

### Merge with Aggregation

```python
# Merge and aggregate in one operation
orders = pd.DataFrame({
    'order_id': [1, 2, 3, 4],
    'customer_id': [101, 102, 101, 103],
    'amount': [100, 200, 150, 300],
})

customers = pd.DataFrame({
    'customer_id': [101, 102, 103],
    'name': ['Alice', 'Bob', 'Charlie'],
})

# Get customer summary
customer_summary = orders.groupby('customer_id').agg(
    total_orders=('order_id', 'count'),
    total_amount=('amount', 'sum'),
).reset_index()

# Merge with customer info
result = pd.merge(customers, customer_summary, on='customer_id')
```

### Merge Asof (Nearest Match)

```python
# Merge on nearest key (useful for time series)
trades = pd.DataFrame({
    'time': pd.to_datetime(['2024-01-01 10:00:01', '2024-01-01 10:00:03', '2024-01-01 10:00:05']),
    'ticker': ['AAPL', 'AAPL', 'AAPL'],
    'price': [150.0, 151.0, 150.5],
})

quotes = pd.DataFrame({
    'time': pd.to_datetime(['2024-01-01 10:00:00', '2024-01-01 10:00:02', '2024-01-01 10:00:04']),
    'ticker': ['AAPL', 'AAPL', 'AAPL'],
    'bid': [149.5, 150.5, 150.0],
    'ask': [150.5, 151.5, 151.0],
})

# Merge asof - find nearest quote for each trade
result = pd.merge_asof(
    trades.sort_values('time'),
    quotes.sort_values('time'),
    on='time',
    by='ticker',
    direction='backward'  # Use most recent quote
)
```

### Conditional Merge

```python
# Merge with conditions beyond key equality
# First merge, then filter

products = pd.DataFrame({
    'product_id': [1, 2, 3],
    'name': ['Widget', 'Gadget', 'Gizmo'],
    'category': ['A', 'B', 'A'],
})

discounts = pd.DataFrame({
    'category': ['A', 'A', 'B'],
    'min_qty': [10, 50, 20],
    'discount': [0.05, 0.10, 0.08],
})

# Cross merge then filter
merged = pd.merge(products, discounts, on='category')
# Then apply quantity-based filtering as needed
```

---

## Performance Considerations

### Pre-sorting for Merge

```python
# Sort keys before merge for better performance
df1 = df1.sort_values('key')
df2 = df2.sort_values('key')

# Merge sorted DataFrames
result = pd.merge(df1, df2, on='key')
```

### Index Alignment

```python
# Using index for merge is often faster than columns
df1 = df1.set_index('key')
df2 = df2.set_index('key')

# Join on index
result = df1.join(df2)
```

### Memory-Efficient Merge

```python
# For large DataFrames, reduce memory before merge
# Convert to appropriate types
df1['key'] = df1['key'].astype('int32')  # Instead of int64
df1['category'] = df1['category'].astype('category')

# Select only needed columns
cols_needed = ['key', 'value1', 'value2']
result = pd.merge(df1[cols_needed], df2[cols_needed], on='key')
```

---

## Common Merge Patterns

### Left Join with Null Check

```python
# Find unmatched rows after left join
result = pd.merge(employees, departments, on='dept_id', how='left')
unmatched = result[result['dept_name'].isna()]
```

### Anti-Join (Rows Not in Other)

```python
# Find employees NOT in a specific department list
dept_list = [101, 102]

# Method 1: Using isin
not_in_depts = employees[~employees['dept_id'].isin(dept_list)]

# Method 2: Using merge with indicator
merged = pd.merge(
    employees,
    pd.DataFrame({'dept_id': dept_list}),
    on='dept_id',
    how='left',
    indicator=True
)
not_in_depts = merged[merged['_merge'] == 'left_only']
```

### Self-Join

```python
# Find pairs within same department
employees = pd.DataFrame({
    'emp_id': [1, 2, 3, 4],
    'name': ['Alice', 'Bob', 'Charlie', 'Diana'],
    'dept_id': [101, 101, 102, 101],
})

# Self-join to find pairs
pairs = pd.merge(
    employees,
    employees,
    on='dept_id',
    suffixes=('_1', '_2')
)
# Remove self-pairs and duplicates
pairs = pairs[pairs['emp_id_1'] < pairs['emp_id_2']]
```

---

## Best Practices Summary

1. **Choose the right join type** - Default inner may drop data
2. **Validate cardinality** - Use `validate` parameter
3. **Use indicator** - Debug unexpected results
4. **Handle duplicates** - Use meaningful suffixes
5. **Pre-sort for performance** - Especially for large DataFrames
6. **Reset index after operations** - Keep DataFrames usable
7. **Check for NaN after join** - Understand unmatched rows

---

## Anti-Patterns to Avoid

```python
# BAD: Merge without understanding cardinality
result = pd.merge(df1, df2, on='key')  # May explode row count

# GOOD: Validate relationship
result = pd.merge(df1, df2, on='key', validate='one_to_one')

# BAD: Repeated merges
result = pd.merge(df1, df2, on='key')
result = pd.merge(result, df3, on='key')
result = pd.merge(result, df4, on='key')

# GOOD: Chain or use reduce
from functools import reduce
dfs = [df1, df2, df3, df4]
result = reduce(lambda left, right: pd.merge(left, right, on='key'), dfs)

# BAD: Ignoring merge indicators
result = pd.merge(df1, df2, on='key', how='outer')

# GOOD: Check merge results
result = pd.merge(df1, df2, on='key', how='outer', indicator=True)
print(result['_merge'].value_counts())
```

---

## Related References

- `dataframe-operations.md` - Filter before/after merge
- `aggregation-groupby.md` - Aggregate before merging
- `performance-optimization.md` - Optimize large merges
