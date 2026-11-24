# N8nTabs

A tab bar selects one view from a set of related views. The caller can render the content, or the component can render panels with the correct ARIA links.

## API Contract

`N8nTabs` is generic over `Value extends string | number`. Vue gets `Value` from `modelValue` and `options`, so `update:modelValue` and `#content` use the narrowed type. A route option (`to`) goes to its route and does not select a tab. The caller sets `modelValue` from the current route. The Reka primitives are exported as `N8nTabsRoot`, `N8nTabsList`, `N8nTabsTrigger`, `N8nTabsContent`, and `N8nTabsIndicator` for layouts that the props cannot express.

Breaking changes from the previous version: `href`, `isDestructive`, the `danger` tab variant, icon-only tabs, and `variant: 'legacy' | 'modern'` are removed. 18 `.vue` files in `packages/frontend` use `N8nTabs`.

```ts
interface TabOptions<Value extends string | number> {
  /** Unique id of the tab. Also used for `id` and `data-test-id="tab-${value}"`. */
  value: Value;
  /** Visible text. Required, because icon-only tabs are not supported. */
  label: string;
  icon?: IconName | (string & {});
  /**
   * Side of the icon.
   * @default 'left'
   */
  iconPosition?: 'left' | 'right';
  /** Colors only the icon, for example 'danger' to flag a problem. */
  iconColor?: IconColor;
  /**
   * Prevents selection. Combine with `tooltip` to explain why.
   * @default false
   */
  disabled?: boolean;
  /** HTML content of the tooltip on the tab. */
  tooltip?: string;
  /**
   * 'right' groups the tab at the right end of the list.
   * @default 'left'
   */
  align?: 'left' | 'right';
  /** Makes the tab a route link. It does not emit `update:modelValue`. */
  to?: RouteLocationRaw;
  /**
   * Shows a notification dot.
   * @default false
   */
  notification?: boolean;
  /** Shows the text in a badge after the label. */
  tag?: string;
  /**
   * Shows a preview badge after the label.
   * @default false
   */
  preview?: boolean;
}

interface TabsProps<Value extends string | number = string | number> {
  /**
   * The selected tab. Bind it with `v-model`.
   * The parent value stays in place until the parent accepts the update.
   */
  modelValue?: Value;
  /**
   * The selected tab on first render when `modelValue` is omitted.
   * The tabs keep later changes.
   */
  defaultValue?: Value;
  /**
   * The tabs to render.
   * @default []
   */
  options?: Array<TabOptions<Value>>;
  /**
   * Tab height. Aligns with the sizes of Select and Input.
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Equal-width tabs over the full width, so a label change does not move other tabs.
   * @default false
   */
  justified?: boolean;
  /**
   * Layout and arrow keys for keyboard navigation.
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Marks the active tab with a bar or a background.
   * @default 'underline'
   */
  variant?: 'underline' | 'filled';
}

interface TabsEvents<Value extends string | number> {
  /** The user selected an enabled tab that is not a route option. */
  'update:modelValue': [value: Value];
  /** The user clicked inside the tooltip content of a tab. */
  tooltipClick: [value: Value, e: MouseEvent];
}

interface TabsSlots<Value extends string | number> {
  /** Caller-controlled content or `N8nTabsContent` panels, after the tab bar, with no wrapper. */
  default?: () => unknown;
  /** Content of the selected tab, in a panel with ARIA links to its tab. */
  content?: (props: { value: Value }) => unknown;
  /** Actions or external links in the tab bar, after the tab list. */
  suffix?: () => unknown;
}
```

## Behaviour

- **Must** select one view at a time. Pass `modelValue` when the parent owns the selection. Omit `modelValue` and pass `defaultValue` to let the component keep the selection.
- **Must** let the caller choose who renders the content: the tab bar only, the caller's own content in `#default`, or component panels in `#content`.
- **Must** treat route options as navigation, not selection. A click goes to the route and does not emit `update:modelValue`.
- **Must** select the tab that receives focus from the arrow keys (automatic activation), so keyboard users see each view as they move.
- **Must** keep every tab reachable when the tabs do not fit a horizontal bar: scroll buttons, and scroll into view on focus.
- **Must** fade only the edges of the tab list that have hidden content: left, right, or both for horizontal tabs, and top, bottom, or both for vertical tabs.
- **Must** keep tabs in place when `justified`, so a label change does not move the other tabs.
- **Should** let a disabled tab explain itself with a `tooltip`, for mouse and keyboard users.
- **Should** match the heights of `N8nSelect` and `N8nInput` at the same `size`, so tabs fit in a toolbar with other controls.
- **Won't** support external links as tabs. A tab changes the view. Use `#suffix` for links.
- **Won't** cover layouts that the props cannot express. Use the exported primitives.

## Open questions
- The notification dot is `aria-hidden`. How does a screen reader user learn about it?
- Reka can remove disabled tabs from focus. How do keyboard users read the tooltip that explains why a tab is disabled?

## References

- Reka UI Tabs: https://reka-ui.com/docs/components/tabs
- WAI-ARIA APG Tabs pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- Source: `packages/frontend/@n8n/design-system/src/components/N8nTabs/`
