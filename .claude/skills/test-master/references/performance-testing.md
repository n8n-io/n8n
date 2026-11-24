# Performance Testing

## k6 Load Test

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 20 },    // Stay at 20 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% requests under 500ms
    http_req_failed: ['rate<0.01'],    // <1% errors
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/users');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

## Stress Test

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp to 100 users
    { duration: '5m', target: 100 },   // Stay at 100
    { duration: '2m', target: 200 },   // Push to 200
    { duration: '5m', target: 200 },   // Stay at 200
    { duration: '2m', target: 0 },     // Ramp down
  ],
};
```

## Spike Test

```javascript
export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Normal load
    { duration: '1m', target: 10 },
    { duration: '10s', target: 200 },  // Spike!
    { duration: '3m', target: 200 },
    { duration: '10s', target: 10 },   // Scale down
    { duration: '3m', target: 10 },
    { duration: '10s', target: 0 },
  ],
};
```

## API Testing with Auth

```javascript
import http from 'k6/http';

export function setup() {
  const loginRes = http.post('http://localhost:3000/api/login', {
    email: 'test@test.com',
    password: '<test-password>',
  });
  return { token: loginRes.json('token') };
}

export default function (data) {
  const params = {
    headers: { Authorization: `Bearer ${data.token}` },
  };

  http.get('http://localhost:3000/api/protected', params);
}
```

## Thresholds Reference

```javascript
thresholds: {
  // Response time
  http_req_duration: ['p(95)<500', 'p(99)<1000'],

  // Error rate
  http_req_failed: ['rate<0.01'],

  // Throughput
  http_reqs: ['rate>100'],

  // Custom metrics
  'http_req_duration{name:login}': ['p(95)<200'],
}
```

## Quick Reference

| Metric | Description |
|--------|-------------|
| `http_req_duration` | Response time |
| `http_req_failed` | Failed requests rate |
| `http_reqs` | Request rate |
| `p(95)` | 95th percentile |
| `rate` | Rate per second |

| Test Type | Purpose |
|-----------|---------|
| Load | Normal expected load |
| Stress | Find breaking point |
| Spike | Sudden traffic surge |
| Soak | Long duration stability |
