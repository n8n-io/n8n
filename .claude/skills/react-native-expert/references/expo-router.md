# Expo Router

## Project Structure

```
app/
├── _layout.tsx           # Root layout
├── index.tsx             # Home (/)
├── +not-found.tsx        # 404 page
├── (tabs)/               # Tab group
│   ├── _layout.tsx       # Tab bar config
│   ├── index.tsx         # First tab
│   └── profile.tsx       # Profile tab
├── (auth)/               # Auth group (no tabs)
│   ├── _layout.tsx
│   ├── login.tsx
│   └── register.tsx
├── settings/
│   ├── _layout.tsx       # Stack layout
│   ├── index.tsx         # Settings main
│   └── notifications.tsx
└── details/[id].tsx      # Dynamic route
```

## Root Layout

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { ThemeProvider } from '@react-navigation/native';

export default function RootLayout() {
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="details/[id]"
          options={{ presentation: 'modal' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
```

## Tab Layout

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
```

## Navigation

```typescript
import { router, useLocalSearchParams, Link } from 'expo-router';

// Programmatic navigation
router.push('/details/123');           // Push to stack
router.replace('/home');               // Replace current
router.back();                          // Go back
router.canGoBack();                     // Check if can go back

// With params
router.push({
  pathname: '/details/[id]',
  params: { id: '123', title: 'Item' },
});

// Link component
<Link href="/profile" asChild>
  <Pressable>
    <Text>Go to Profile</Text>
  </Pressable>
</Link>

// Reading params
function DetailsScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  return <Text>Details for {id}</Text>;
}
```

## Protected Routes

```typescript
// app/(auth)/_layout.tsx
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

// app/(tabs)/_layout.tsx
export default function TabLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Tabs>...</Tabs>;
}
```

## Deep Linking

```json
// app.json
{
  "expo": {
    "scheme": "myapp",
    "web": {
      "bundler": "metro"
    }
  }
}
```

```typescript
// Handle: myapp://details/123
// app/details/[id].tsx handles automatically
```

## Quick Reference

| Component | Purpose |
|-----------|---------|
| `<Stack>` | Stack navigator |
| `<Tabs>` | Tab navigator |
| `<Drawer>` | Drawer navigator |
| `<Link>` | Declarative navigation |

| router method | Behavior |
|---------------|----------|
| `push()` | Add to stack |
| `replace()` | Replace current |
| `back()` | Go back |
| `dismissAll()` | Dismiss modals |
