# Pagination Patterns

## Why Paginate?

Large collections can't be returned all at once due to:
- Performance (slow queries, large payloads)
- Memory constraints (server and client)
- Network timeouts
- Poor user experience

Always paginate collection endpoints.

## Pagination Strategies

### 1. Offset-Based Pagination

Most common and intuitive. Uses `offset` (skip) and `limit` (page size).

**Request:**
```http
GET /users?offset=20&limit=10
```

**Response:**
```json
{
  "data": [
    {"id": 21, "name": "User 21"},
    {"id": 22, "name": "User 22"}
  ],
  "pagination": {
    "offset": 20,
    "limit": 10,
    "total": 150,
    "has_more": true
  },
  "links": {
    "first": "/users?offset=0&limit=10",
    "prev": "/users?offset=10&limit=10",
    "next": "/users?offset=30&limit=10",
    "last": "/users?offset=140&limit=10"
  }
}
```

**Advantages:**
- Simple to implement
- Easy to understand
- Random access (jump to any page)
- Shows total count

**Disadvantages:**
- Performance degrades with large offsets (database scans many rows)
- Inconsistent results if data changes during pagination
- Inefficient for real-time data
- Database must count total rows (expensive)

**Use when:**
- Small to medium datasets
- Data doesn't change frequently
- Need random page access
- Need total count

### 2. Page-Based Pagination

Simplified offset pagination using page numbers.

**Request:**
```http
GET /users?page=3&per_page=10
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 3,
    "per_page": 10,
    "total_pages": 15,
    "total_count": 150
  },
  "links": {
    "first": "/users?page=1&per_page=10",
    "prev": "/users?page=2&per_page=10",
    "next": "/users?page=4&per_page=10",
    "last": "/users?page=15&per_page=10"
  }
}
```

**Calculation:**
- `offset = (page - 1) * per_page`
- `total_pages = ceil(total_count / per_page)`

**Same pros/cons as offset-based, but:**
- More intuitive for users (page 1, page 2)
- Common in web applications

### 3. Cursor-Based Pagination

Uses an opaque cursor (pointer) to the next set of results.

**Request:**
```http
GET /users?limit=10
GET /users?cursor=<cursor>&limit=10
```

**Response:**
```json
{
  "data": [
    {"id": 21, "name": "User 21"},
    {"id": 22, "name": "User 22"}
  ],
  "pagination": {
    "next_cursor": "<next-cursor>",
    "prev_cursor": "<prev-cursor>",
    "has_more": true
  },
  "links": {
    "next": "/users?cursor=<next-cursor>&limit=10",
    "prev": "/users?cursor=<prev-cursor>&limit=10"
  }
}
```

**Cursor structure (base64 encoded):**
```json
{"id": 30, "sort": "created_at"}
```

**Implementation:**
```sql
-- First page
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;

-- Next page (cursor points to last item)
SELECT * FROM users
WHERE created_at < '2024-01-15T10:30:00Z'
ORDER BY created_at DESC
LIMIT 10;
```

**Advantages:**
- Consistent results (no skipped/duplicate items)
- Efficient for large datasets
- Works well with real-time data
- No expensive COUNT query
- Better database performance

**Disadvantages:**
- No random access (can't jump to page 10)
- No total count
- More complex to implement
- Cursor is opaque (users can't modify it)

**Use when:**
- Large datasets
- Data changes frequently
- Infinite scroll UI
- Real-time feeds
- Performance is critical

### 4. Keyset Pagination

Similar to cursor but uses actual field values instead of opaque cursor.

**Request:**
```http
GET /users?after_id=20&limit=10
GET /users?after_created_at=2024-01-15T10:30:00Z&limit=10
```

**Response:**
```json
{
  "data": [
    {"id": 21, "name": "User 21", "created_at": "2024-01-15T11:00:00Z"},
    {"id": 22, "name": "User 22", "created_at": "2024-01-15T11:30:00Z"}
  ],
  "pagination": {
    "after_id": 30,
    "limit": 10,
    "has_more": true
  },
  "links": {
    "next": "/users?after_id=30&limit=10"
  }
}
```

**Implementation:**
```sql
SELECT * FROM users
WHERE id > 20
ORDER BY id ASC
LIMIT 10;
```

**Advantages:**
- Very efficient (uses index)
- Transparent cursor (human readable)
- Consistent results
- Simple implementation

**Disadvantages:**
- Requires indexed column
- No random access
- Sorting limited to cursor field
- Complex for multi-field sorting

**Use when:**
- Simple ordering (by ID, timestamp)
- Need efficient pagination
- Want transparent cursor
- Have proper indexes

### 5. Seek Pagination (Time-Based)

Specialized keyset pagination for time-series data.

**Request:**
```http
GET /events?since=2024-01-15T10:00:00Z&until=2024-01-15T11:00:00Z&limit=100
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "since": "2024-01-15T10:00:00Z",
    "until": "2024-01-15T11:00:00Z",
    "limit": 100,
    "has_more": true
  },
  "links": {
    "next": "/events?since=2024-01-15T11:00:00Z&until=2024-01-15T12:00:00Z&limit=100"
  }
}
```

**Use for:**
- Time-series data
- Logs and events
- Activity streams
- Analytics data

## Default Limits

Always set reasonable defaults and maximum limits:

```json
{
  "default_limit": 20,
  "max_limit": 100,
  "min_limit": 1
}
```

**Validation:**
```http
GET /users?limit=1000

Response: 400 Bad Request
{
  "error": {
    "code": "INVALID_LIMIT",
    "message": "Limit must be between 1 and 100. Default is 20."
  }
}
```

## Response Format

### Standard Pagination Object

```json
{
  "data": [...],
  "pagination": {
    "limit": 10,
    "offset": 20,
    "total": 150,
    "has_more": true,
    "has_previous": true
  }
}
```

### Link Header (RFC 5988)

```http
Link: </users?offset=0&limit=10>; rel="first",
      </users?offset=10&limit=10>; rel="prev",
      </users?offset=30&limit=10>; rel="next",
      </users?offset=140&limit=10>; rel="last"
```

**Used by:** GitHub API

### Embedded Links

```json
{
  "data": [...],
  "_links": {
    "self": { "href": "/users?offset=20&limit=10" },
    "first": { "href": "/users?offset=0&limit=10" },
    "prev": { "href": "/users?offset=10&limit=10" },
    "next": { "href": "/users?offset=30&limit=10" },
    "last": { "href": "/users?offset=140&limit=10" }
  }
}
```

## Sorting with Pagination

Always support sorting when paginating:

```http
GET /users?sort=created_at&order=desc&limit=10
GET /users?sort=-created_at&limit=10                    # Descending
GET /users?sort=last_name,first_name&limit=10           # Multi-field
```

**For cursor pagination, cursor must include sort fields:**
```json
{
  "cursor": {
    "id": 123,
    "created_at": "2024-01-15T10:30:00Z",
    "sort_fields": ["created_at", "id"]
  }
}
```

## Filtering with Pagination

Combine filtering with pagination:

```http
GET /users?status=active&role=admin&offset=0&limit=10
```

**Important:** Apply filters before pagination:
1. Filter records
2. Count filtered results
3. Apply pagination
4. Return paginated subset

## Total Count

### Include Total Count

```json
{
  "data": [...],
  "pagination": {
    "total": 1523,
    "limit": 10,
    "offset": 20
  }
}
```

**Pros:**
- Clients know total results
- Can calculate total pages
- Better UX (show "Page 3 of 153")

**Cons:**
- COUNT query is expensive
- Slows down response
- Inaccurate for large/changing datasets

### Omit Total Count

```json
{
  "data": [...],
  "pagination": {
    "has_more": true,
    "limit": 10
  }
}
```

**Use when:**
- Large datasets (COUNT is too slow)
- Real-time data (count changes constantly)
- Cursor pagination
- Infinite scroll UI

### Optional Total Count

Let client request total count:

```http
GET /users?limit=10&include_total=true
```

## Edge Cases

### Empty Results

```json
{
  "data": [],
  "pagination": {
    "offset": 0,
    "limit": 10,
    "total": 0,
    "has_more": false
  }
}
```

### Last Page

```json
{
  "data": [{"id": 150, "name": "Last User"}],
  "pagination": {
    "offset": 140,
    "limit": 10,
    "total": 150,
    "has_more": false
  },
  "links": {
    "first": "/users?offset=0&limit=10",
    "prev": "/users?offset=130&limit=10",
    "next": null
  }
}
```

### Out of Range

```http
GET /users?offset=10000&limit=10

Response: 200 OK (empty results)
{
  "data": [],
  "pagination": {
    "offset": 10000,
    "limit": 10,
    "total": 150,
    "has_more": false
  }
}
```

Or return 404 for pages that don't exist:
```http
GET /users?page=1000&per_page=10

Response: 404 Not Found
{
  "error": {
    "code": "PAGE_NOT_FOUND",
    "message": "Page 1000 does not exist. Total pages: 15"
  }
}
```

## Best Practices

1. **Always paginate collections** - Never return unbounded lists
2. **Set reasonable defaults** - Default limit of 20-50 items
3. **Enforce maximum limits** - Prevent excessive loads (max 100-1000)
4. **Include has_more flag** - Tell clients if more results exist
5. **Provide navigation links** - Make it easy to get next/prev pages
6. **Document pagination** - Explain cursor format, limits, defaults
7. **Be consistent** - Use same pagination pattern across all endpoints
8. **Consider performance** - Choose strategy based on data size/type
9. **Support sorting** - Let clients control result order
10. **Handle edge cases** - Empty results, last page, invalid cursors

## Comparison Matrix

| Feature | Offset | Page | Cursor | Keyset |
|---------|--------|------|--------|--------|
| Performance | Poor for large offsets | Poor | Excellent | Excellent |
| Random access | Yes | Yes | No | No |
| Total count | Yes | Yes | No | Optional |
| Consistency | Poor | Poor | Excellent | Excellent |
| Complexity | Simple | Simple | Medium | Medium |
| Real-time data | Poor | Poor | Excellent | Excellent |
| Database load | High | High | Low | Low |
| Use case | Small datasets | Web UIs | Feeds/streams | Large datasets |
