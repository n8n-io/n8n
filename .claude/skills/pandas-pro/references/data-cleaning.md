# Data Cleaning

---

## Overview

Data cleaning is critical for reliable analysis. This reference covers handling missing values, duplicates, type conversion, and data validation with pandas 2.0+ patterns.

---

## Missing Values

### Detecting Missing Values

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    'name': ['Alice', 'Bob', None, 'Diana'],
    'age': [25, np.nan, 35, 28],
    'salary': [50000, 60000, np.nan, np.nan],
    'department': ['Eng', '', 'Eng', 'Sales']
})

# Check for any missing values
df.isna().any()  # Per column
df.isna().any().any()  # Entire DataFrame

# Count missing values
df.isna().sum()  # Per column
df.isna().sum().sum()  # Total

# Percentage of missing values
(df.isna().sum() / len(df) * 100).round(2)

# Rows with any missing values
df[df.isna().any(axis=1)]

# Rows with all values present
df[df.notna().all(axis=1)]

# Missing value heatmap info
missing_info = pd.DataFrame({
    'missing': df.isna().sum(),
    'percent': (df.isna().sum() / len(df) * 100).round(2),
    'dtype': df.dtypes
})
```

### Handling Missing Values - Dropping

```python
# Drop rows with any missing value
df_clean = df.dropna()

# Drop rows where specific columns have missing values
df_clean = df.dropna(subset=['name', 'age'])

# Drop rows where ALL values are missing
df_clean = df.dropna(how='all')

# Drop rows with minimum non-null values
df_clean = df.dropna(thresh=3)  # Keep rows with at least 3 non-null

# Drop columns with missing values
df_clean = df.dropna(axis=1)

# Drop columns with more than 50% missing
threshold = len(df) * 0.5
df_clean = df.dropna(axis=1, thresh=threshold)
```

### Handling Missing Values - Filling

```python
# Fill with constant value
df['age'] = df['age'].fillna(0)

# Fill with column mean/median/mode
df['age'] = df['age'].fillna(df['age'].mean())
df['salary'] = df['salary'].fillna(df['salary'].median())
df['department'] = df['department'].fillna(df['department'].mode()[0])

# Forward fill (use previous value)
df['salary'] = df['salary'].ffill()

# Backward fill (use next value)
df['salary'] = df['salary'].bfill()

# Fill with different values per column
fill_values = {'age': 0, 'salary': df['salary'].median(), 'name': 'Unknown'}
df = df.fillna(fill_values)

# Fill with interpolation (numeric data)
df['salary'] = df['salary'].interpolate(method='linear')

# Group-specific fill (fill with group mean)
df['salary'] = df.groupby('department')['salary'].transform(
    lambda x: x.fillna(x.mean())
)
```

### Handling Empty Strings vs NaN

```python
# Empty strings are NOT detected as NaN
df['department'].isna().sum()  # Won't count ''

# Replace empty strings with NaN
df['department'] = df['department'].replace('', np.nan)
# Or
df['department'] = df['department'].replace(r'^\s*$', np.nan, regex=True)

# Replace multiple values with NaN
df = df.replace(['', 'N/A', 'null', 'None', '-'], np.nan)

# Using na_values when reading files
df = pd.read_csv('file.csv', na_values=['', 'N/A', 'null', 'None', '-'])
```

---

## Handling Duplicates

### Detecting Duplicates

```python
df = pd.DataFrame({
    'id': [1, 2, 2, 3, 4, 4],
    'name': ['Alice', 'Bob', 'Bob', 'Charlie', 'Diana', 'Diana'],
    'email': ['a@x.com', 'b@x.com', 'b@x.com', 'c@x.com', 'd@x.com', 'd2@x.com']
})

# Check for duplicate rows (all columns)
df.duplicated().sum()

# Check specific columns
df.duplicated(subset=['id']).sum()
df.duplicated(subset=['name', 'email']).sum()

# View duplicate rows
df[df.duplicated(keep=False)]  # All duplicates
df[df.duplicated(keep='first')]  # Duplicates except first occurrence
df[df.duplicated(keep='last')]  # Duplicates except last occurrence

# Count duplicates per key
df.groupby('id').size().loc[lambda x: x > 1]
```

### Removing Duplicates

```python
# Remove duplicate rows (keep first)
df_clean = df.drop_duplicates()

# Keep last occurrence
df_clean = df.drop_duplicates(keep='last')

# Remove all duplicates (keep none)
df_clean = df.drop_duplicates(keep=False)

# Based on specific columns
df_clean = df.drop_duplicates(subset=['id'])
df_clean = df.drop_duplicates(subset=['name', 'email'], keep='last')

# In-place modification
df.drop_duplicates(inplace=True)
```

### Handling Duplicates with Aggregation

```python
# Instead of dropping, aggregate duplicates
df_agg = df.groupby('id').agg({
    'name': 'first',
    'email': lambda x: ', '.join(x.unique())
}).reset_index()

# Keep row with max/min value
df_best = df.loc[df.groupby('id')['score'].idxmax()]

# Rank duplicates
df['rank'] = df.groupby('id').cumcount() + 1
```

---

## Type Conversion

### Checking and Converting Types

```python
# Check current types
df.dtypes
df.info()

# Convert to specific type
df['age'] = df['age'].astype(int)
df['salary'] = df['salary'].astype(float)
df['name'] = df['name'].astype(str)

# Safe conversion with errors handling
df['age'] = pd.to_numeric(df['age'], errors='coerce')  # Invalid -> NaN
df['age'] = pd.to_numeric(df['age'], errors='ignore')  # Keep original if invalid

# Convert multiple columns
df = df.astype({'age': 'int64', 'salary': 'float64'})

# Convert object to string (pandas 2.0+ StringDtype)
df['name'] = df['name'].astype('string')  # Nullable string type
```

### Datetime Conversion

```python
df = pd.DataFrame({
    'date_str': ['2024-01-15', '2024-02-20', 'invalid', '2024-03-10'],
    'timestamp': [1705276800, 1708387200, 1710028800, 1710028800]
})

# String to datetime
df['date'] = pd.to_datetime(df['date_str'], errors='coerce')

# Specify format for faster parsing
df['date'] = pd.to_datetime(df['date_str'], format='%Y-%m-%d', errors='coerce')

# Unix timestamp to datetime
df['datetime'] = pd.to_datetime(df['timestamp'], unit='s')

# Extract components
df['year'] = df['date'].dt.year
df['month'] = df['date'].dt.month
df['day_of_week'] = df['date'].dt.day_name()

# Handle mixed formats
df['date'] = pd.to_datetime(df['date_str'], format='mixed', dayfirst=False)
```

### Categorical Conversion

```python
# Convert to categorical (memory efficient for low cardinality)
df['department'] = df['department'].astype('category')

# Ordered categorical
df['size'] = pd.Categorical(
    df['size'],
    categories=['Small', 'Medium', 'Large'],
    ordered=True
)

# Check memory savings
print(f"Object: {df['department'].nbytes}")
df['department'] = df['department'].astype('category')
print(f"Category: {df['department'].nbytes}")
```

### Nullable Integer Types (pandas 2.0+)

```python
# Standard int doesn't support NaN
# Use nullable integer types
df['age'] = df['age'].astype('Int64')  # Note capital I

# All nullable types
df = df.astype({
    'count': 'Int64',      # Nullable integer
    'price': 'Float64',    # Nullable float
    'flag': 'boolean',     # Nullable boolean
    'name': 'string',      # Nullable string
})

# Convert with NA handling
df['age'] = pd.array([1, 2, None, 4], dtype='Int64')
```

---

## String Cleaning

### Common String Operations

```python
df = pd.DataFrame({
    'name': ['  Alice  ', 'BOB', 'charlie', None, 'Diana Smith'],
    'email': ['ALICE@EXAMPLE.COM', 'bob@test', 'invalid', None, 'diana@example.com']
})

# Strip whitespace
df['name'] = df['name'].str.strip()

# Case normalization
df['name'] = df['name'].str.lower()
df['name'] = df['name'].str.upper()
df['name'] = df['name'].str.title()  # Title Case

# Replace patterns
df['name'] = df['name'].str.replace(r'\s+', ' ', regex=True)  # Multiple spaces to one
df['phone'] = df['phone'].str.replace(r'[^0-9]', '', regex=True)  # Keep only digits

# Extract with regex
df['domain'] = df['email'].str.extract(r'@(.+)$')
df['first_name'] = df['name'].str.extract(r'^(\w+)')

# Split strings
df[['first', 'last']] = df['name'].str.split(' ', n=1, expand=True)
```

### String Validation

```python
# Check patterns
df['valid_email'] = df['email'].str.match(r'^[\w.]+@[\w.]+\.\w+$', na=False)

# String length
df['name_length'] = df['name'].str.len()
df['valid_length'] = df['name'].str.len().between(2, 50)

# Contains check
df['has_domain'] = df['email'].str.contains('@', na=False)
```

---

## Data Validation

### Validation Functions

```python
def validate_dataframe(df: pd.DataFrame) -> dict:
    """Comprehensive DataFrame validation."""
    report = {
        'rows': len(df),
        'columns': len(df.columns),
        'duplicates': df.duplicated().sum(),
        'missing_by_column': df.isna().sum().to_dict(),
        'dtypes': df.dtypes.astype(str).to_dict(),
    }
    return report

# Range validation
def validate_range(series: pd.Series, min_val, max_val) -> pd.Series:
    """Return boolean mask for values in range."""
    return series.between(min_val, max_val)

df['valid_age'] = validate_range(df['age'], 0, 120)

# Custom validation
def validate_email(series: pd.Series) -> pd.Series:
    """Validate email format."""
    pattern = r'^[\w.+-]+@[\w-]+\.[\w.-]+$'
    return series.str.match(pattern, na=False)

df['valid_email'] = validate_email(df['email'])
```

### Schema Validation with pandera

```python
# Using pandera for schema validation (recommended for production)
import pandera as pa
from pandera import Column, Check

schema = pa.DataFrameSchema({
    'name': Column(str, Check.str_length(min_value=1, max_value=100)),
    'age': Column(int, Check.in_range(0, 120)),
    'email': Column(str, Check.str_matches(r'^[\w.+-]+@[\w-]+\.[\w.-]+$')),
    'salary': Column(float, Check.greater_than(0), nullable=True),
})

# Validate DataFrame
try:
    schema.validate(df)
except pa.errors.SchemaError as e:
    print(f"Validation failed: {e}")
```

---

## Data Cleaning Pipeline

### Method Chaining Pattern

```python
def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Complete data cleaning pipeline using method chaining."""
    return (
        df
        # Make a copy
        .copy()
        # Standardize column names
        .rename(columns=lambda x: x.lower().strip().replace(' ', '_'))
        # Drop fully empty rows
        .dropna(how='all')
        # Clean string columns
        .assign(
            name=lambda x: x['name'].str.strip().str.title(),
            email=lambda x: x['email'].str.lower().str.strip(),
        )
        # Handle missing values
        .fillna({'department': 'Unknown'})
        # Convert types
        .astype({'age': 'Int64', 'department': 'category'})
        # Remove duplicates
        .drop_duplicates(subset=['email'])
        # Reset index
        .reset_index(drop=True)
    )

df_clean = clean_dataframe(df)
```

### Pipeline with Validation

```python
def clean_and_validate(
    df: pd.DataFrame,
    required_columns: list[str],
    unique_columns: list[str] | None = None,
) -> tuple[pd.DataFrame, dict]:
    """Clean DataFrame and return validation report."""

    # Validate required columns exist
    missing_cols = set(required_columns) - set(df.columns)
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")

    # Track cleaning stats
    stats = {
        'initial_rows': len(df),
        'dropped_empty': 0,
        'dropped_duplicates': 0,
        'filled_missing': {},
    }

    # Clean
    df = df.copy()

    # Drop empty rows
    before = len(df)
    df = df.dropna(how='all')
    stats['dropped_empty'] = before - len(df)

    # Handle duplicates
    if unique_columns:
        before = len(df)
        df = df.drop_duplicates(subset=unique_columns)
        stats['dropped_duplicates'] = before - len(df)

    stats['final_rows'] = len(df)

    return df, stats
```

---

## Best Practices Summary

1. **Always check data quality first** - Use `.info()`, `.describe()`, and missing value analysis
2. **Document cleaning decisions** - Track what was dropped/filled and why
3. **Use nullable types** - `Int64`, `string`, `boolean` for proper NA handling
4. **Validate after cleaning** - Ensure data meets expectations
5. **Use method chaining** - Readable, maintainable cleaning pipelines
6. **Copy before modifying** - Avoid SettingWithCopyWarning
7. **Handle edge cases** - Empty strings, whitespace, invalid formats

---

## Anti-Patterns to Avoid

```python
# BAD: Dropping NaN without understanding impact
df = df.dropna()  # May lose significant data

# GOOD: Investigate first, then decide
print(f"Missing values: {df.isna().sum()}")
print(f"Rows affected: {df.isna().any(axis=1).sum()}")
# Then make informed decision

# BAD: Filling without domain knowledge
df['age'] = df['age'].fillna(0)  # Age 0 is not valid

# GOOD: Use appropriate fill strategy
df['age'] = df['age'].fillna(df['age'].median())

# BAD: Type conversion without error handling
df['id'] = df['id'].astype(int)  # Will fail on NaN or invalid

# GOOD: Safe conversion
df['id'] = pd.to_numeric(df['id'], errors='coerce').astype('Int64')
```

---

## Related References

- `dataframe-operations.md` - Selection and filtering for targeted cleaning
- `aggregation-groupby.md` - Aggregate duplicates instead of dropping
- `performance-optimization.md` - Efficient cleaning of large datasets
