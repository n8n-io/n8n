# Aggregation and GroupBy

---

## Overview

Aggregation transforms data from individual records to summary statistics. This reference covers GroupBy, pivot tables, crosstab, and advanced aggregation patterns with pandas 2.0+.

---

## GroupBy Fundamentals

### Basic GroupBy

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    'department': ['Eng', 'Eng', 'Sales', 'Sales', 'Eng', 'HR'],
    'team': ['Backend', 'Frontend', 'East', 'West', 'Backend', 'Recruit'],
    'employee': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'],
    'salary': [80000, 75000, 65000, 70000, 85000, 60000],
    'years': [5, 3, 7, 4, 6, 2]
})

# Single column groupby with single aggregation
avg_salary = df.groupby('department')['salary'].mean()

# Multiple aggregations
stats = df.groupby('department')['salary'].agg(['mean', 'min', 'max', 'count'])

# GroupBy multiple columns
grouped = df.groupby(['department', 'team'])['salary'].mean()

# Reset index to get DataFrame instead of Series
grouped = df.groupby('department')['salary'].mean().reset_index()
```

### Multiple Columns, Multiple Aggregations

```python
# Named aggregation (pandas 2.0+ preferred)
result = df.groupby('department').agg(
    avg_salary=('salary', 'mean'),
    max_salary=('salary', 'max'),
    total_years=('years', 'sum'),
    headcount=('employee', 'count'),
)

# Dictionary syntax (traditional)
result = df.groupby('department').agg({
    'salary': ['mean', 'max', 'std'],
    'years': ['sum', 'mean'],
})

# Flatten multi-level column names
result.columns = ['_'.join(col).strip() for col in result.columns.values]
```

### Custom Aggregation Functions

```python
# Lambda functions
result = df.groupby('department').agg({
    'salary': lambda x: x.max() - x.min(),  # Range
    'years': lambda x: x.quantile(0.75),    # 75th percentile
})

# Named functions for clarity
def salary_range(x):
    return x.max() - x.min()

def coefficient_of_variation(x):
    return x.std() / x.mean() if x.mean() != 0 else 0

result = df.groupby('department').agg(
    salary_range=('salary', salary_range),
    salary_cv=('salary', coefficient_of_variation),
)

# Multiple custom functions
result = df.groupby('department')['salary'].agg([
    ('range', lambda x: x.max() - x.min()),
    ('iqr', lambda x: x.quantile(0.75) - x.quantile(0.25)),
    ('median', 'median'),
])
```

---

## Transform and Apply

### Transform - Returns Same Shape

```python
# Transform returns Series with same index as original
# Useful for adding aggregated values back to original DataFrame

# Add group mean as new column
df['dept_avg_salary'] = df.groupby('department')['salary'].transform('mean')

# Normalize within group
df['salary_zscore'] = df.groupby('department')['salary'].transform(
    lambda x: (x - x.mean()) / x.std()
)

# Rank within group
df['salary_rank'] = df.groupby('department')['salary'].transform('rank', ascending=False)

# Percentage of group total
df['salary_pct'] = df.groupby('department')['salary'].transform(
    lambda x: x / x.sum() * 100
)

# Fill missing with group mean
df['salary'] = df.groupby('department')['salary'].transform(
    lambda x: x.fillna(x.mean())
)
```

### Apply - Flexible Operations

```python
# Apply runs function on each group DataFrame
def top_n_by_salary(group, n=2):
    return group.nlargest(n, 'salary')

top_earners = df.groupby('department').apply(top_n_by_salary, n=2)

# Reset index after apply
top_earners = df.groupby('department', group_keys=False).apply(
    top_n_by_salary, n=2
).reset_index(drop=True)

# Complex group operations
def group_summary(group):
    return pd.Series({
        'headcount': len(group),
        'avg_salary': group['salary'].mean(),
        'top_earner': group.loc[group['salary'].idxmax(), 'employee'],
        'avg_tenure': group['years'].mean(),
    })

summary = df.groupby('department').apply(group_summary)
```

### Filter - Keep/Remove Groups

```python
# Keep only groups meeting a condition
# Groups with average salary > 70000
filtered = df.groupby('department').filter(lambda x: x['salary'].mean() > 70000)

# Groups with more than 2 members
filtered = df.groupby('department').filter(lambda x: len(x) > 2)

# Combined conditions
filtered = df.groupby('department').filter(
    lambda x: (len(x) >= 2) and (x['salary'].mean() > 65000)
)
```

---

## Pivot Tables

### Basic Pivot Table

```python
df = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=6),
    'product': ['A', 'B', 'A', 'B', 'A', 'B'],
    'region': ['East', 'East', 'West', 'West', 'East', 'West'],
    'sales': [100, 150, 120, 180, 90, 200],
    'quantity': [10, 15, 12, 18, 9, 20],
})

# Simple pivot
pivot = df.pivot_table(
    values='sales',
    index='product',
    columns='region',
    aggfunc='sum'
)

# Multiple values
pivot = df.pivot_table(
    values=['sales', 'quantity'],
    index='product',
    columns='region',
    aggfunc='sum'
)

# Multiple aggregation functions
pivot = df.pivot_table(
    values='sales',
    index='product',
    columns='region',
    aggfunc=['sum', 'mean', 'count']
)
```

### Advanced Pivot Table Options

```python
# Fill missing values
pivot = df.pivot_table(
    values='sales',
    index='product',
    columns='region',
    aggfunc='sum',
    fill_value=0
)

# Add margins (totals)
pivot = df.pivot_table(
    values='sales',
    index='product',
    columns='region',
    aggfunc='sum',
    margins=True,
    margins_name='Total'
)

# Multiple index levels
pivot = df.pivot_table(
    values='sales',
    index=['product', df['date'].dt.month],
    columns='region',
    aggfunc='sum'
)

# Observed categories only (for categorical data)
pivot = df.pivot_table(
    values='sales',
    index='product',
    columns='region',
    aggfunc='sum',
    observed=True  # pandas 2.0+ default changed
)
```

### Unpivoting (Melt)

```python
# Wide to long format
wide_df = pd.DataFrame({
    'product': ['A', 'B'],
    'Q1_sales': [100, 150],
    'Q2_sales': [120, 180],
    'Q3_sales': [90, 200],
})

# Melt to long format
long_df = pd.melt(
    wide_df,
    id_vars=['product'],
    value_vars=['Q1_sales', 'Q2_sales', 'Q3_sales'],
    var_name='quarter',
    value_name='sales'
)

# Clean quarter column
long_df['quarter'] = long_df['quarter'].str.replace('_sales', '')
```

---

## Crosstab

### Basic Crosstab

```python
df = pd.DataFrame({
    'gender': ['M', 'F', 'M', 'F', 'M', 'F', 'M', 'M'],
    'department': ['Eng', 'Eng', 'Sales', 'Sales', 'Eng', 'HR', 'HR', 'Eng'],
    'level': ['Senior', 'Junior', 'Senior', 'Senior', 'Junior', 'Junior', 'Senior', 'Junior'],
})

# Simple crosstab (counts)
ct = pd.crosstab(df['gender'], df['department'])

# Normalized crosstab
ct_pct = pd.crosstab(df['gender'], df['department'], normalize='all')  # Total
ct_pct = pd.crosstab(df['gender'], df['department'], normalize='index')  # Row
ct_pct = pd.crosstab(df['gender'], df['department'], normalize='columns')  # Column

# With margins
ct = pd.crosstab(df['gender'], df['department'], margins=True)

# Multiple levels
ct = pd.crosstab(
    [df['gender'], df['level']],
    df['department']
)
```

### Crosstab with Aggregation

```python
df['salary'] = [80000, 75000, 65000, 70000, 85000, 60000, 72000, 78000]

# Crosstab with values and aggregation
ct = pd.crosstab(
    df['gender'],
    df['department'],
    values=df['salary'],
    aggfunc='mean'
)

# Multiple aggregations
ct = pd.crosstab(
    df['gender'],
    df['department'],
    values=df['salary'],
    aggfunc=['mean', 'sum', 'count']
)
```

---

## Window Functions with GroupBy

### Rolling Aggregations

```python
df = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=10),
    'product': ['A', 'B'] * 5,
    'sales': [100, 150, 110, 160, 120, 170, 130, 180, 140, 190],
})

# Rolling mean within groups
df['rolling_avg'] = df.groupby('product')['sales'].transform(
    lambda x: x.rolling(window=3, min_periods=1).mean()
)

# Expanding aggregations
df['cumulative_sales'] = df.groupby('product')['sales'].transform('cumsum')

df['expanding_avg'] = df.groupby('product')['sales'].transform(
    lambda x: x.expanding().mean()
)

# Rank within groups
df['sales_rank'] = df.groupby('product')['sales'].rank(method='dense')
```

### Shift and Diff

```python
# Previous value within group
df['prev_sales'] = df.groupby('product')['sales'].shift(1)

# Next value
df['next_sales'] = df.groupby('product')['sales'].shift(-1)

# Period-over-period change
df['sales_change'] = df.groupby('product')['sales'].diff()

# Percentage change
df['sales_pct_change'] = df.groupby('product')['sales'].pct_change()
```

---

## Common Aggregation Patterns

### Summary Statistics

```python
# Comprehensive summary by group
def full_summary(group):
    return pd.Series({
        'count': len(group),
        'mean': group['salary'].mean(),
        'std': group['salary'].std(),
        'min': group['salary'].min(),
        'q25': group['salary'].quantile(0.25),
        'median': group['salary'].median(),
        'q75': group['salary'].quantile(0.75),
        'max': group['salary'].max(),
        'sum': group['salary'].sum(),
    })

summary = df.groupby('department').apply(full_summary)
```

### Top N Per Group

```python
# Top 2 salaries per department
top_2 = df.groupby('department', group_keys=False).apply(
    lambda x: x.nlargest(2, 'salary')
)

# Using head after sorting
top_2 = df.sort_values('salary', ascending=False).groupby(
    'department', group_keys=False
).head(2)

# Bottom N
bottom_2 = df.groupby('department', group_keys=False).apply(
    lambda x: x.nsmallest(2, 'salary')
)
```

### First/Last Per Group

```python
# First row per group
first = df.groupby('department').first()

# Last row per group
last = df.groupby('department').last()

# First row after sorting
first_by_salary = df.sort_values('salary', ascending=False).groupby(
    'department'
).first()

# Nth row
nth = df.groupby('department').nth(1)  # Second row (0-indexed)
```

### Cumulative Operations

```python
# Cumulative sum
df['cum_sales'] = df.groupby('department')['salary'].cumsum()

# Cumulative max/min
df['cum_max'] = df.groupby('department')['salary'].cummax()
df['cum_min'] = df.groupby('department')['salary'].cummin()

# Cumulative count
df['cum_count'] = df.groupby('department').cumcount() + 1

# Running percentage of total
df['running_pct'] = df.groupby('department')['salary'].transform(
    lambda x: x.cumsum() / x.sum() * 100
)
```

---

## Performance Tips for GroupBy

### Efficient GroupBy Operations

```python
# Pre-sort for faster groupby operations
df = df.sort_values('department')
grouped = df.groupby('department', sort=False)  # Already sorted

# Use observed=True for categorical columns (pandas 2.0+ default)
df['department'] = df['department'].astype('category')
grouped = df.groupby('department', observed=True)['salary'].mean()

# Avoid apply when possible - use built-in aggregations
# SLOWER:
result = df.groupby('department')['salary'].apply(lambda x: x.sum())
# FASTER:
result = df.groupby('department')['salary'].sum()

# Use numba for custom aggregations (if available)
@numba.jit(nopython=True)
def custom_agg(values):
    return values.sum() / len(values)
```

### Memory-Efficient Aggregation

```python
# For large DataFrames, compute aggregations separately
groups = df.groupby('department')

means = groups['salary'].mean()
sums = groups['salary'].sum()
counts = groups.size()

result = pd.DataFrame({
    'mean': means,
    'sum': sums,
    'count': counts
})

# Avoid creating intermediate large DataFrames
# BAD: Creates full transformed DataFrame
df['z_score'] = (df['salary'] - df.groupby('department')['salary'].transform('mean')) / df.groupby('department')['salary'].transform('std')

# BETTER: Compute once
group_stats = df.groupby('department')['salary'].agg(['mean', 'std'])
df = df.merge(group_stats, on='department')
df['z_score'] = (df['salary'] - df['mean']) / df['std']
```

---

## Best Practices Summary

1. **Use named aggregation** - Clearer than dictionary syntax
2. **Choose transform vs apply wisely** - Transform for same-shape, apply for flexible
3. **Pre-sort for performance** - Use `sort=False` after sorting
4. **Prefer built-in aggregations** - Faster than lambda/apply
5. **Use observed=True** - Especially for categorical data
6. **Reset index when needed** - Keep DataFrames easier to work with
7. **Validate group counts** - Check for unexpected groups

---

## Anti-Patterns to Avoid

```python
# BAD: Iterating over groups manually
for name, group in df.groupby('department'):
    # process group
    pass

# GOOD: Use vectorized operations
df.groupby('department').agg(...)

# BAD: Multiple groupby calls
df.groupby('dept')['salary'].mean()
df.groupby('dept')['salary'].sum()
df.groupby('dept')['salary'].count()

# GOOD: Single groupby, multiple aggs
df.groupby('dept')['salary'].agg(['mean', 'sum', 'count'])

# BAD: Apply for simple aggregations
df.groupby('dept')['salary'].apply(np.mean)

# GOOD: Built-in method
df.groupby('dept')['salary'].mean()
```

---

## Related References

- `dataframe-operations.md` - Filtering before aggregation
- `merging-joining.md` - Join aggregated results back
- `performance-optimization.md` - Optimize large-scale aggregations
