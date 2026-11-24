# Platform Handling

## Platform.select

```typescript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  text: {
    fontFamily: Platform.select({
      ios: 'Helvetica Neue',
      android: 'Roboto',
    }),
  },
});
```

## Platform.OS

```typescript
import { Platform } from 'react-native';

function MyComponent() {
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  return (
    <View>
      {isIOS && <IOSOnlyComponent />}
      <Text>{isAndroid ? 'Android' : 'iOS'}</Text>
    </View>
  );
}
```

## Platform-Specific Files

```
components/
├── Button.tsx           # Shared logic
├── Button.ios.tsx       # iOS-specific
└── Button.android.tsx   # Android-specific
```

```typescript
// Import resolves to correct platform file
import Button from './components/Button';
```

## SafeAreaView

```typescript
import { SafeAreaView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Method 1: SafeAreaView component
function Screen() {
  return (
    <SafeAreaView style={styles.container}>
      <Content />
    </SafeAreaView>
  );
}

// Method 2: useSafeAreaInsets hook (more control)
function CustomHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <Text>Header</Text>
    </View>
  );
}

// Method 3: SafeAreaProvider context
import { SafeAreaProvider } from 'react-native-safe-area-context';

function App() {
  return (
    <SafeAreaProvider>
      <Navigation />
    </SafeAreaProvider>
  );
}
```

## KeyboardAvoidingView

```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';

function FormScreen() {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.select({ ios: 88, android: 0 })}
    >
      <ScrollView>
        <TextInput placeholder="Name" />
        <TextInput placeholder="Email" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

## StatusBar

```typescript
import { StatusBar, Platform } from 'react-native';

function Screen() {
  return (
    <>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor={Platform.OS === 'android' ? '#000' : undefined}
      />
      <Content />
    </>
  );
}
```

## Android Back Button

```typescript
import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

function useBackHandler(handler: () => boolean) {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handler
    );

    return () => subscription.remove();
  }, [handler]);
}

// Usage
function Screen() {
  useBackHandler(() => {
    if (hasUnsavedChanges) {
      showDiscardAlert();
      return true; // Prevent default back
    }
    return false; // Allow default back
  });
}
```

## Quick Reference

| API | Purpose |
|-----|---------|
| `Platform.OS` | Get platform ('ios' / 'android') |
| `Platform.select()` | Platform-specific values |
| `Platform.Version` | OS version number |
| `.ios.tsx` / `.android.tsx` | Platform-specific files |

| Component | Purpose |
|-----------|---------|
| `SafeAreaView` | Avoid notch/home indicator |
| `KeyboardAvoidingView` | Keyboard handling |
| `StatusBar` | Status bar styling |
| `BackHandler` | Android back button |
