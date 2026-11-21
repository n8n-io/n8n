# Window Functions

## Ranking Functions

```sql
-- ROW_NUMBER: Sequential numbering within partition
SELECT
    customer_id,
    order_date,
    total,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) as row_num
FROM orders;

-- Get most recent order per customer
SELECT *
FROM (
    SELECT
        customer_id,
        order_id,
        order_date,
        total,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) as rn
    FROM orders
) ranked
WHERE rn = 1;

-- RANK: Same values get same rank, gaps in sequence
SELECT
    student_id,
    score,
    RANK() OVER (ORDER BY score DESC) as rank,
    DENSE_RANK() OVER (ORDER BY score DESC) as dense_rank,
    ROW_NUMBER() OVER (ORDER BY score DESC) as row_num
FROM exam_results;
/*
score=100: rank=1, dense_rank=1, row_num=1
score=100: rank=1, dense_rank=1, row_num=2
score=95:  rank=3, dense_rank=2, row_num=3
*/

-- NTILE: Divide into N buckets
SELECT
    customer_id,
    total_spent,
    NTILE(4) OVER (ORDER BY total_spent DESC) as quartile
FROM customer_lifetime_value;
```

## Aggregate Window Functions

```sql
-- Running totals and cumulative sums
SELECT
    order_date,
    daily_revenue,
    SUM(daily_revenue) OVER (ORDER BY order_date) as cumulative_revenue,
    AVG(daily_revenue) OVER (
        ORDER BY order_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as rolling_7day_avg
FROM daily_sales;

-- Moving average with RANGE
SELECT
    sale_date,
    amount,
    AVG(amount) OVER (
        ORDER BY sale_date
        RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW
    ) as avg_last_7_days
FROM sales;

-- Partition-specific aggregates
SELECT
    product_id,
    sale_date,
    quantity,
    SUM(quantity) OVER (PARTITION BY product_id ORDER BY sale_date) as cumulative_qty,
    AVG(quantity) OVER (PARTITION BY product_id) as avg_qty_for_product,
    quantity::FLOAT / SUM(quantity) OVER (PARTITION BY product_id) as pct_of_total
FROM product_sales;
```

## LAG and LEAD Functions

```sql
-- Compare with previous/next row
SELECT
    order_date,
    total,
    LAG(total) OVER (ORDER BY order_date) as previous_day_total,
    LEAD(total) OVER (ORDER BY order_date) as next_day_total,
    total - LAG(total) OVER (ORDER BY order_date) as day_over_day_change
FROM daily_orders;

-- Find gaps in time series
SELECT
    event_date,
    LAG(event_date) OVER (ORDER BY event_date) as prev_date,
    event_date - LAG(event_date) OVER (ORDER BY event_date) as days_since_last
FROM events
WHERE event_date - LAG(event_date) OVER (ORDER BY event_date) > 7;

-- Session analysis with time gaps
SELECT
    user_id,
    action_time,
    LAG(action_time) OVER (PARTITION BY user_id ORDER BY action_time) as prev_action,
    EXTRACT(EPOCH FROM (
        action_time - LAG(action_time) OVER (PARTITION BY user_id ORDER BY action_time)
    )) / 60 as minutes_since_last_action,
    CASE
        WHEN EXTRACT(EPOCH FROM (
            action_time - LAG(action_time) OVER (PARTITION BY user_id ORDER BY action_time)
        )) / 60 > 30 THEN 1
        ELSE 0
    END as new_session
FROM user_actions;
```

## FIRST_VALUE and LAST_VALUE

```sql
-- Compare each row to first/last in partition
SELECT
    product_id,
    price_date,
    price,
    FIRST_VALUE(price) OVER (
        PARTITION BY product_id
        ORDER BY price_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) as initial_price,
    LAST_VALUE(price) OVER (
        PARTITION BY product_id
        ORDER BY price_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) as current_price,
    price - FIRST_VALUE(price) OVER (
        PARTITION BY product_id
        ORDER BY price_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) as price_change_from_start
FROM product_price_history;

-- NTH_VALUE: Get specific positioned value
SELECT
    sale_date,
    amount,
    NTH_VALUE(amount, 2) OVER (
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) as second_day_amount
FROM daily_sales;
```

## Frame Specifications

```sql
-- ROWS vs RANGE difference
SELECT
    order_date,
    amount,
    -- ROWS: Physical row offset
    SUM(amount) OVER (
        ORDER BY order_date
        ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING
    ) as sum_5_rows,
    -- RANGE: Logical value range
    SUM(amount) OVER (
        ORDER BY order_date
        RANGE BETWEEN INTERVAL '2 days' PRECEDING AND INTERVAL '2 days' FOLLOWING
    ) as sum_5_day_range
FROM orders;

-- Common frame patterns
SELECT
    sale_date,
    revenue,
    -- All preceding rows
    SUM(revenue) OVER (
        ORDER BY sale_date
        ROWS UNBOUNDED PRECEDING
    ) as running_total,
    -- Last 3 rows including current
    AVG(revenue) OVER (
        ORDER BY sale_date
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) as ma_3,
    -- Entire partition
    SUM(revenue) OVER (
        PARTITION BY EXTRACT(YEAR FROM sale_date)
    ) as yearly_total,
    -- Centered window
    AVG(revenue) OVER (
        ORDER BY sale_date
        ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING
    ) as centered_ma_7
FROM sales;
```

## Advanced Analytics

```sql
-- Percentile calculations
SELECT
    employee_id,
    salary,
    PERCENT_RANK() OVER (ORDER BY salary) as pct_rank,
    CUME_DIST() OVER (ORDER BY salary) as cumulative_dist,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) OVER () as median_salary,
    PERCENTILE_DISC(0.9) WITHIN GROUP (ORDER BY salary) OVER () as p90_salary
FROM employees;

-- Cohort retention analysis
WITH user_cohorts AS (
    SELECT
        user_id,
        DATE_TRUNC('month', signup_date) as cohort_month,
        DATE_TRUNC('month', activity_date) as activity_month
    FROM user_activity
),
cohort_sizes AS (
    SELECT
        cohort_month,
        COUNT(DISTINCT user_id) as cohort_size
    FROM user_cohorts
    GROUP BY cohort_month
)
SELECT
    uc.cohort_month,
    uc.activity_month,
    EXTRACT(MONTH FROM AGE(uc.activity_month, uc.cohort_month)) as months_since_signup,
    COUNT(DISTINCT uc.user_id) as active_users,
    cs.cohort_size,
    ROUND(100.0 * COUNT(DISTINCT uc.user_id) / cs.cohort_size, 2) as retention_pct
FROM user_cohorts uc
JOIN cohort_sizes cs ON uc.cohort_month = cs.cohort_month
GROUP BY uc.cohort_month, uc.activity_month, cs.cohort_size
ORDER BY uc.cohort_month, months_since_signup;

-- Time-series gap filling
SELECT
    date_series.date,
    COALESCE(s.revenue, 0) as revenue,
    AVG(s.revenue) OVER (
        ORDER BY date_series.date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as ma_7day
FROM generate_series(
    '2024-01-01'::DATE,
    '2024-12-31'::DATE,
    '1 day'::INTERVAL
) AS date_series(date)
LEFT JOIN sales s ON date_series.date = s.sale_date;
```

## Conditional Aggregation with Windows

```sql
-- Filter within window function
SELECT
    product_id,
    sale_date,
    quantity,
    SUM(quantity) FILTER (WHERE quantity > 10) OVER (
        PARTITION BY product_id
        ORDER BY sale_date
    ) as cumulative_large_orders,
    COUNT(*) FILTER (WHERE quantity > 100) OVER (
        PARTITION BY product_id
    ) as total_bulk_orders
FROM sales;

-- Multiple conditions
SELECT
    customer_id,
    order_date,
    total,
    COUNT(*) FILTER (WHERE total > 1000) OVER (
        PARTITION BY customer_id
    ) as high_value_order_count,
    AVG(total) FILTER (WHERE total < 100) OVER (
        PARTITION BY customer_id
    ) as avg_small_order_value
FROM orders;
```

## Performance Considerations

```sql
-- Avoid multiple window passes - combine into one
-- Bad: Multiple scans
SELECT
    product_id,
    (SELECT AVG(price) FROM products) as avg_price,
    (SELECT MAX(price) FROM products) as max_price
FROM products;

-- Good: Single window pass
SELECT DISTINCT
    AVG(price) OVER () as avg_price,
    MAX(price) OVER () as max_price
FROM products;

-- Materialize expensive windows
CREATE MATERIALIZED VIEW product_rankings AS
SELECT
    product_id,
    category,
    sales_count,
    RANK() OVER (PARTITION BY category ORDER BY sales_count DESC) as category_rank,
    PERCENT_RANK() OVER (ORDER BY sales_count DESC) as overall_percentile
FROM product_sales_summary;

CREATE INDEX idx_product_rankings_category ON product_rankings(category, category_rank);
```

## Common Patterns

1. **Top N per Group**: Use ROW_NUMBER() with WHERE rn <= N
2. **Running Totals**: SUM() OVER (ORDER BY date)
3. **Moving Averages**: AVG() with ROWS BETWEEN N PRECEDING
4. **Session Analysis**: LAG() to detect time gaps
5. **Deduplication**: ROW_NUMBER() OVER (PARTITION BY key ORDER BY priority) WHERE rn = 1
6. **Percentiles**: PERCENT_RANK() or PERCENTILE_CONT()
7. **Year-over-Year**: LAG(value, 12) OVER (ORDER BY month)
8. **Cohort Analysis**: PARTITION BY cohort_date, aggregate over activity periods
