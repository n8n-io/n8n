# Testing React

## Basic Component Test

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('renders greeting', () => {
  render(<Greeting name="World" />);
  expect(screen.getByText('Hello, World!')).toBeInTheDocument();
});

test('increments counter on click', async () => {
  const user = userEvent.setup();
  render(<Counter />);

  await user.click(screen.getByRole('button', { name: /increment/i }));

  expect(screen.getByText('1')).toBeInTheDocument();
});
```

## Query Priority

```tsx
// Preferred: Accessible queries (how users find elements)
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText('Email');
screen.getByPlaceholderText('Search...');
screen.getByText('Welcome');

// Fallback: Test IDs (when no accessible name)
screen.getByTestId('custom-element');

// Async queries (wait for element)
await screen.findByText('Loading complete');
```

## Testing Forms

```tsx
test('submits form with user data', async () => {
  const handleSubmit = vi.fn();
  const user = userEvent.setup();

  render(<ContactForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.type(screen.getByLabelText('Email'), 'john@example.com');
  await user.selectOptions(screen.getByLabelText('Topic'), 'support');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    name: 'John Doe',
    email: 'john@example.com',
    topic: 'support',
  });
});
```

## Testing with Providers

```tsx
function renderWithProviders(
  ui: React.ReactElement,
  { initialState = {}, ...options } = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

test('displays user data', async () => {
  renderWithProviders(<UserProfile userId="123" />);

  await screen.findByText('John Doe');
});
```

## Mocking API Calls

```tsx
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'John' });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('fetches and displays user', async () => {
  render(<UserProfile userId="123" />);

  await screen.findByText('John');
});

test('handles error', async () => {
  server.use(
    http.get('/api/users/:id', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  render(<UserProfile userId="123" />);

  await screen.findByText('Error loading user');
});
```

## Testing Hooks

```tsx
import { renderHook, act } from '@testing-library/react';

test('useCounter increments', () => {
  const { result } = renderHook(() => useCounter());

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});

test('useDebounce delays value', async () => {
  vi.useFakeTimers();

  const { result, rerender } = renderHook(
    ({ value }) => useDebounce(value, 500),
    { initialProps: { value: 'initial' } }
  );

  rerender({ value: 'updated' });
  expect(result.current).toBe('initial');

  await act(async () => {
    vi.advanceTimersByTime(500);
  });

  expect(result.current).toBe('updated');
  vi.useRealTimers();
});
```

## Quick Reference

| Query | Use When |
|-------|----------|
| `getByRole` | Buttons, links, headings |
| `getByLabelText` | Form inputs |
| `getByText` | Non-interactive text |
| `findByX` | Async/loading content |
| `queryByX` | Assert NOT present |

| Pattern | Use Case |
|---------|----------|
| `userEvent.setup()` | User interactions |
| `renderHook()` | Testing custom hooks |
| `msw` | Mocking API calls |
| Custom render | Wrap with providers |
