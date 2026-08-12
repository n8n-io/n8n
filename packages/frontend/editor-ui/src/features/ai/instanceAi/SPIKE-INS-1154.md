# INS-1154 Spike findings

Throwaway spike on this branch. Answers for INS-1157:

## 1. Modal stacking

**Default: no.** `N8nFloatingWindow` hardcodes `z-index: 299` (below canvas chrome,
below modals at ~2000).

**Workaround: yes.** Override on the wrapper:

```scss
.window {
  z-index: var(--ask-assistant-floating-button--z); // 3000
}
```

With that override the floating panel renders above the credential edit modal
without pushing layout. Verified approach matches Ask Assistant floating button.

## 2. Chat body reuse

**Decision: compose a slim body — do not mount full `InstanceAiThreadView`.**

`InstanceAiThreadView` assumes the `/assistant` page: sidebar, artifacts panel,
route-param teardown, window sizing. It fights a ~560×700 floating window.

Spike body (`InstanceAiFloatingChatBody.vue`) reuses:

- `provideThread` / existing `ThreadRuntime` (SSE + send work without the route)
- `InstanceAiMessage`
- `InstanceAiInput`
- `InstanceAiStatusBar`
- `InstanceAiConfirmationPanel` with `kind="floating"`

Confirmations, streaming, and send all work through the same runtime map.

## Default placement / Intercom dock

Bottom-right Intercom-style launcher circle. Proactive offers stack as a
bubble above it; clicking the circle opens the floating panel (~560×820)
above the launcher. Double-click the panel header to reset position.

1. Instance AI enabled, this branch, `pnpm dev`
2. `?instanceAiDemoOffer=1` → wait ~3s → **Get help**
3. Floating panel opens on the seeded thread; send another message to confirm SSE

Or in console:

```js
const { useInstanceAiPanelStore } = await import(
  '/src/features/ai/instanceAi/instanceAiPanel.store.ts'
);
await useInstanceAiPanelStore().openWithSeed({
  key: 'spike:1',
  title: 'Spike',
  message: 'Say hello from the floating panel spike',
  source: 'proactive_offer',
});
```
