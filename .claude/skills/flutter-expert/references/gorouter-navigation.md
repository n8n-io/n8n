# GoRouter Navigation

## Basic Setup

```dart
import 'package:go_router/go_router.dart';

final goRouter = GoRouter(
  initialLocation: '/',
  redirect: (context, state) {
    final isLoggedIn = /* check auth */;
    if (!isLoggedIn && !state.matchedLocation.startsWith('/auth')) {
      return '/auth/login';
    }
    return null;
  },
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
      routes: [
        GoRoute(
          path: 'details/:id',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            return DetailsScreen(id: id);
          },
        ),
      ],
    ),
    GoRoute(
      path: '/auth/login',
      builder: (context, state) => const LoginScreen(),
    ),
  ],
);

// In app.dart
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      routerConfig: goRouter,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
    );
  }
}
```

## Navigation Methods

```dart
// Navigate and replace history
context.go('/details/123');

// Navigate and add to stack
context.push('/details/123');

// Go back
context.pop();

// Replace current route
context.pushReplacement('/home');

// Navigate with extra data
context.push('/details/123', extra: {'title': 'Item'});

// Access extra in destination
final extra = GoRouterState.of(context).extra as Map<String, dynamic>?;
```

## Shell Routes (Persistent UI)

```dart
final goRouter = GoRouter(
  routes: [
    ShellRoute(
      builder: (context, state, child) {
        return ScaffoldWithNavBar(child: child);
      },
      routes: [
        GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      ],
    ),
  ],
);
```

## Query Parameters

```dart
GoRoute(
  path: '/search',
  builder: (context, state) {
    final query = state.uri.queryParameters['q'] ?? '';
    final page = int.tryParse(state.uri.queryParameters['page'] ?? '1') ?? 1;
    return SearchScreen(query: query, page: page);
  },
),

// Navigate with query params
context.go('/search?q=flutter&page=2');
```

## Quick Reference

| Method | Behavior |
|--------|----------|
| `context.go()` | Navigate, replace stack |
| `context.push()` | Navigate, add to stack |
| `context.pop()` | Go back |
| `context.pushReplacement()` | Replace current |
| `:param` | Path parameter |
| `?key=value` | Query parameter |
