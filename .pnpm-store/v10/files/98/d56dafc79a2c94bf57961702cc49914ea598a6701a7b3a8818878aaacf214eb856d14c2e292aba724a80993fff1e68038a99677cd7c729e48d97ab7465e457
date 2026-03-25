import { getCurrentInstance, useAttrs, useSlots } from 'vue';
import dayjs from 'dayjs';
import '../../../../utils/index.mjs';
import { isFunction } from '@vue/shared';

const useShortcut = (lang) => {
  const { emit } = getCurrentInstance();
  const attrs = useAttrs();
  const slots = useSlots();
  const handleShortcutClick = (shortcut) => {
    const shortcutValues = isFunction(shortcut.value) ? shortcut.value() : shortcut.value;
    if (shortcutValues) {
      emit("pick", [
        dayjs(shortcutValues[0]).locale(lang.value),
        dayjs(shortcutValues[1]).locale(lang.value)
      ]);
      return;
    }
    if (shortcut.onClick) {
      shortcut.onClick({
        attrs,
        slots,
        emit
      });
    }
  };
  return handleShortcutClick;
};

export { useShortcut };
//# sourceMappingURL=use-shortcut.mjs.map
