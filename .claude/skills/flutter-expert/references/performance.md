# Performance Optimization

## Profiling Commands

```bash
# Run in profile mode
flutter run --profile

# Analyze performance
flutter analyze

# DevTools
flutter pub global activate devtools
flutter pub global run devtools
```

## Common Optimizations

### Const Widgets
```dart
// ❌ Rebuilds every time
Widget build(BuildContext context) {
  return Container(
    padding: EdgeInsets.all(16),  // Creates new object
    child: Text('Hello'),
  );
}

// ✅ Const prevents rebuilds
Widget build(BuildContext context) {
  return Container(
    padding: const EdgeInsets.all(16),
    child: const Text('Hello'),
  );
}
```

### Selective Provider Watching
```dart
// ❌ Rebuilds on any user change
final user = ref.watch(userProvider);
return Text(user.name);

// ✅ Only rebuilds when name changes
final name = ref.watch(userProvider.select((u) => u.name));
return Text(name);
```

### RepaintBoundary
```dart
// Isolate expensive widgets
RepaintBoundary(
  child: ComplexAnimatedWidget(),
)
```

### Image Optimization
```dart
// Use cached_network_image
CachedNetworkImage(
  imageUrl: url,
  placeholder: (_, __) => const CircularProgressIndicator(),
  errorWidget: (_, __, ___) => const Icon(Icons.error),
)

// Resize images
Image.network(
  url,
  cacheWidth: 200,  // Resize in memory
  cacheHeight: 200,
)
```

### Compute for Heavy Operations
```dart
// ❌ Blocks UI thread
final result = heavyComputation(data);

// ✅ Runs in isolate
final result = await compute(heavyComputation, data);
```

## Performance Checklist

| Check | Solution |
|-------|----------|
| Unnecessary rebuilds | Add `const`, use `select()` |
| Large lists | Use `ListView.builder` |
| Image loading | Use `cached_network_image` |
| Heavy computation | Use `compute()` |
| Jank in animations | Use `RepaintBoundary` |
| Memory leaks | Dispose controllers |

## DevTools Metrics

- **Frame rendering time**: < 16ms for 60fps
- **Widget rebuilds**: Minimize unnecessary rebuilds
- **Memory usage**: Watch for leaks
- **CPU profiler**: Identify bottlenecks
