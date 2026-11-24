# E2E Testing

## E2E Test Strategy

```typescript
// Critical user paths to test
const criticalPaths = [
  'User registration and login',
  'Core product/service workflow',
  'Payment/checkout flow',
  'Settings and profile management',
];
```

## User Flow Testing

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test('complete registration', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('Email').fill('new@example.com');
    await page.getByLabel('Password').fill('<test-password>');
    await page.getByLabel('Confirm Password').fill('<test-password>');
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText('Welcome')).toBeVisible();
  });

  test('shows validation errors', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('Email').fill('invalid');
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.getByText('Invalid email')).toBeVisible();
  });
});
```

## Checkout Flow

```typescript
test.describe('Checkout Flow', () => {
  test('complete purchase', async ({ page }) => {
    // Add to cart
    await page.goto('/products/123');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(page.getByTestId('cart-count')).toHaveText('1');

    // Checkout
    await page.goto('/cart');
    await page.getByRole('button', { name: 'Checkout' }).click();

    // Payment
    await page.getByLabel('Card Number').fill('4242424242424242');
    await page.getByLabel('Expiry').fill('12/25');
    await page.getByLabel('CVC').fill('123');
    await page.getByRole('button', { name: 'Pay' }).click();

    // Confirmation
    await expect(page).toHaveURL(/order-confirmation/);
    await expect(page.getByText('Order Confirmed')).toBeVisible();
  });
});
```

## Test Data Management

```typescript
// fixtures/testData.ts
export const testUsers = {
  standard: {
    email: 'standard@test.com',
    password: '<test-password>',
  },
  admin: {
    email: 'admin@test.com',
    password: '<admin-test-password>',
  },
};

// Test setup
test.beforeEach(async ({ page }) => {
  // Seed test data
  await page.request.post('/api/test/seed');
});

test.afterEach(async ({ page }) => {
  // Clean up
  await page.request.post('/api/test/cleanup');
});
```

## Cross-Browser Testing

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
});
```

## Quick Reference

| Pattern | When to Use |
|---------|-------------|
| Happy path | Critical user journeys |
| Error handling | Form validation, API errors |
| Edge cases | Empty states, max limits |
| Cross-browser | Before major releases |
| Mobile | Responsive features |

| Priority | Test Coverage |
|----------|---------------|
| **P0** | Registration, login, core feature |
| **P1** | Payment, settings, common flows |
| **P2** | Edge cases, admin features |
| **P3** | Rare scenarios |
