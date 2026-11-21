# Widget Patterns

## Optimized Widget Pattern

```dart
// Use const constructors
class OptimizedCard extends StatelessWidget {
  final String title;
  final VoidCallback onTap;

  const OptimizedCard({
    super.key,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(title, style: Theme.of(context).textTheme.titleMedium),
        ),
      ),
    );
  }
}
```

## Responsive Layout

```dart
class ResponsiveLayout extends StatelessWidget {
  final Widget mobile;
  final Widget? tablet;
  final Widget desktop;

  const ResponsiveLayout({
    super.key,
    required this.mobile,
    this.tablet,
    required this.desktop,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= 1100) return desktop;
        if (constraints.maxWidth >= 650) return tablet ?? mobile;
        return mobile;
      },
    );
  }
}
```

## Custom Hooks (flutter_hooks)

```dart
import 'package:flutter_hooks/flutter_hooks.dart';

class CounterWidget extends HookWidget {
  @override
  Widget build(BuildContext context) {
    final counter = useState(0);
    final controller = useTextEditingController();

    useEffect(() {
      // Setup
      return () {
        // Cleanup
      };
    }, []);

    return Column(
      children: [
        Text('Count: ${counter.value}'),
        ElevatedButton(
          onPressed: () => counter.value++,
          child: const Text('Increment'),
        ),
      ],
    );
  }
}
```

## Sliver Patterns

```dart
CustomScrollView(
  slivers: [
    SliverAppBar(
      expandedHeight: 200,
      pinned: true,
      flexibleSpace: FlexibleSpaceBar(
        title: const Text('Title'),
        background: Image.network(imageUrl, fit: BoxFit.cover),
      ),
    ),
    SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) => ListTile(title: Text('Item $index')),
        childCount: 100,
      ),
    ),
  ],
)
```

## Key Optimization Patterns

| Pattern | Implementation |
|---------|----------------|
| **const widgets** | Add `const` to static widgets |
| **keys** | Use `Key` for list items |
| **select** | `ref.watch(provider.select(...))` |
| **RepaintBoundary** | Isolate expensive repaints |
| **ListView.builder** | Lazy loading for lists |
| **const constructors** | Always use when possible |
