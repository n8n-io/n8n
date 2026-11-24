# Project Structure

## Expo Router Structure

```
my-app/
├── app/                      # File-based routing
│   ├── _layout.tsx           # Root layout
│   ├── index.tsx             # Home screen
│   ├── +not-found.tsx        # 404 screen
│   ├── (tabs)/               # Tab navigator group
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── search.tsx
│   │   └── profile.tsx
│   ├── (auth)/               # Auth screens (no tabs)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── [id].tsx              # Dynamic route
├── components/
│   ├── ui/                   # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Input.tsx
│   └── features/             # Feature-specific components
│       ├── ProductCard.tsx
│       └── UserAvatar.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useStorage.ts
│   └── useApi.ts
├── services/
│   ├── api.ts                # API client
│   └── auth.ts               # Auth service
├── stores/
│   └── useUserStore.ts       # Zustand stores
├── constants/
│   ├── colors.ts
│   └── layout.ts
├── types/
│   └── index.ts
├── utils/
│   └── helpers.ts
├── assets/
│   ├── images/
│   └── fonts/
├── app.json
├── babel.config.js
└── tsconfig.json
```

## app.json Configuration

```json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "version": "1.0.0",
    "scheme": "myapp",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.company.myapp"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.company.myapp"
    },
    "plugins": [
      "expo-router"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

## tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["components/*"],
      "@/hooks/*": ["hooks/*"],
      "@/services/*": ["services/*"],
      "@/stores/*": ["stores/*"],
      "@/types/*": ["types/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

## babel.config.js

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': '.',
            '@/components': './components',
            '@/hooks': './hooks',
          },
        },
      ],
      'react-native-reanimated/plugin', // Must be last
    ],
  };
};
```

## Essential Dependencies

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "expo-router": "~3.4.0",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0",
    "@react-navigation/native": "^6.1.0",
    "react-native-reanimated": "~3.6.0",
    "react-native-gesture-handler": "~2.14.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.0.0",
    "expo-image": "~1.10.0",
    "react-native-mmkv": "^2.11.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.0",
    "typescript": "^5.3.0"
  }
}
```

## Quick Reference

| Directory | Purpose |
|-----------|---------|
| `app/` | File-based routes |
| `components/ui/` | Reusable UI |
| `components/features/` | Feature components |
| `hooks/` | Custom hooks |
| `services/` | API, auth services |
| `stores/` | State management |
| `constants/` | App constants |
| `types/` | TypeScript types |
