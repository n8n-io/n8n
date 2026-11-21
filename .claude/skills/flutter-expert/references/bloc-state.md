# Bloc State Management

## When to Use Bloc

Use **Bloc/Cubit** when you need:

* Explicit event → state transitions
* Complex business logic
* Predictable, testable flows
* Clear separation between UI and logic

| Use Case               | Recommended |
| ---------------------- | ----------- |
| Simple mutable state   | Riverpod    |
| Event-driven workflows | Bloc        |
| Forms, auth, wizards   | Bloc        |
| Feature modules        | Bloc        |

---

## Core Concepts

| Concept | Description            |
| ------- | ---------------------- |
| Event   | User/system input      |
| State   | Immutable UI state     |
| Bloc    | Event → State mapper   |
| Cubit   | State-only (no events) |

---

## Basic Bloc Setup

### Event

```dart
sealed class CounterEvent {}

final class CounterIncremented extends CounterEvent {}

final class CounterDecremented extends CounterEvent {}
```

### State

```dart
class CounterState {
  final int value;

  const CounterState({required this.value});

  CounterState copyWith({int? value}) {
    return CounterState(value: value ?? this.value);
  }
}
```

### Bloc

```dart
import 'package:flutter_bloc/flutter_bloc.dart';

class CounterBloc extends Bloc<CounterEvent, CounterState> {
  CounterBloc() : super(const CounterState(value: 0)) {
    on<CounterIncremented>((event, emit) {
      emit(state.copyWith(value: state.value + 1));
    });

    on<CounterDecremented>((event, emit) {
      emit(state.copyWith(value: state.value - 1));
    });
  }
}
```

---

## Cubit (Recommended for Simpler Logic)

```dart
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);

  void increment() => emit(state + 1);
  void decrement() => emit(state - 1);
}
```

---

## Providing Bloc to the Widget Tree

```dart
BlocProvider(
  create: (_) => CounterBloc(),
  child: const CounterScreen(),
);
```

Multiple blocs:

```dart
MultiBlocProvider(
  providers: [
    BlocProvider(create: (_) => AuthBloc()),
    BlocProvider(create: (_) => ProfileBloc()),
  ],
  child: const AppRoot(),
);
```

---

## Using Bloc in Widgets

### BlocBuilder (UI rebuilds)

```dart
class CounterScreen extends StatelessWidget {
  const CounterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<CounterBloc, CounterState>(
      buildWhen: (prev, curr) => prev.value != curr.value,
      builder: (context, state) {
        return Text(
          state.value.toString(),
          style: Theme.of(context).textTheme.displayLarge,
        );
      },
    );
  }
}
```

---

### BlocListener (Side Effects)

```dart
BlocListener<AuthBloc, AuthState>(
  listenWhen: (prev, curr) => curr is AuthFailure,
  listener: (context, state) {
    if (state is AuthFailure) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(state.message)));
    }
  },
  child: const LoginForm(),
);
```

---

### BlocConsumer (Builder + Listener)

```dart
BlocConsumer<FormBloc, FormState>(
  listener: (context, state) {
    if (state.status == FormStatus.success) {
      context.pop();
    }
  },
  builder: (context, state) {
    return ElevatedButton(
      onPressed: state.isValid
          ? () => context.read<FormBloc>().add(FormSubmitted())
          : null,
      child: const Text('Submit'),
    );
  },
);
```

---

## Accessing Bloc Without Rebuilds

```dart
context.read<CounterBloc>().add(CounterIncremented());
```

⚠️ **Never use `watch` inside callbacks**

---

## Async Bloc Pattern (API Calls)

```dart
on<UserRequested>((event, emit) async {
  emit(const UserState.loading());

  try {
    final user = await repository.fetchUser();
    emit(UserState.success(user));
  } catch (e) {
    emit(UserState.failure(e.toString()));
  }
});
```

---

## Bloc + GoRouter (Auth Guard Example)

```dart
redirect: (context, state) {
  final authState = context.read<AuthBloc>().state;

  if (authState is Unauthenticated) {
    return '/login';
  }
  return null;
}
```

---

## Testing Bloc

```dart
blocTest<CounterBloc, CounterState>(
  'emits incremented value',
  build: () => CounterBloc(),
  act: (bloc) => bloc.add(CounterIncremented()),
  expect: () => [
    const CounterState(value: 1),
  ],
);
```

---

## Best Practices (MUST FOLLOW)

✅ Immutable states
✅ Small, focused blocs
✅ One feature = one bloc
✅ Use Cubit when possible
✅ Test all blocs

❌ No UI logic inside blocs
❌ No context usage inside blocs
❌ No mutable state
❌ No massive “god blocs”

---

## Quick Reference

| Widget            | Purpose              |
| ----------------- | -------------------- |
| BlocBuilder       | UI rebuild           |
| BlocListener      | Side effects         |
| BlocConsumer      | Both                 |
| BlocProvider      | Dependency injection |
| MultiBlocProvider | Multiple blocs       |

