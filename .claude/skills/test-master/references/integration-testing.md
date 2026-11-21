# Integration Testing

## API Testing (Supertest)

```typescript
import request from 'supertest';
import { app } from '../app';

describe('POST /api/users', () => {
  it('creates user with valid data', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'test@test.com', name: 'Test' })
      .expect(201);

    expect(response.body).toMatchObject({
      email: 'test@test.com',
      name: 'Test',
    });
    expect(response.body.id).toBeDefined();
  });

  it('returns 400 for invalid email', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'invalid', name: 'Test' })
      .expect(400);

    expect(response.body.error).toContain('email');
  });

  it('returns 401 without auth token', async () => {
    await request(app)
      .get('/api/users/me')
      .expect(401);
  });
});
```

## Authenticated Requests

```typescript
describe('Protected endpoints', () => {
  let authToken: string;

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: '<test-password>' });
    authToken = response.body.token;
  });

  it('accesses protected route', async () => {
    await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });
});
```

## Database Testing

```typescript
import { db } from '../database';

describe('UserRepository', () => {
  beforeEach(async () => {
    await db.query('DELETE FROM users');
  });

  afterAll(async () => {
    await db.end();
  });

  it('creates and retrieves user', async () => {
    const user = await userRepo.create({
      email: 'test@test.com',
      name: 'Test',
    });

    const found = await userRepo.findById(user.id);
    expect(found).toEqual(user);
  });
});
```

## pytest API Testing

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_user(client: AsyncClient):
    response = await client.post("/api/users/", json={
        "email": "test@example.com",
        "name": "Test"
    })
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"

@pytest.mark.asyncio
async def test_invalid_email(client: AsyncClient):
    response = await client.post("/api/users/", json={
        "email": "invalid",
        "name": "Test"
    })
    assert response.status_code == 422
```

## Quick Reference

| Method | Purpose |
|--------|---------|
| `.send(body)` | Send request body |
| `.set(header, value)` | Set header |
| `.expect(status)` | Assert status code |
| `.expect('Content-Type', /json/)` | Assert header |
| `response.body` | Parsed JSON body |
