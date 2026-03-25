import { ref } from 'vue';
import { isFunction } from '@vue/shared';
import '../../../utils/index.mjs';
import { isKorean } from '../../../utils/i18n.mjs';

function useInput(handleInput) {
  const isComposing = ref(false);
  const handleCompositionStart = () => {
    isComposing.value = true;
  };
  const handleCompositionUpdate = (event) => {
    const text = event.target.value;
    const lastCharacter = text[text.length - 1] || "";
    isComposing.value = !isKorean(lastCharacter);
  };
  const handleCompositionEnd = (event) => {
    if (isComposing.value) {
      isComposing.value = false;
      if (isFunction(handleInput)) {
        handleInput(event);
      }
    }
  };
  return {
    handleCompositionStart,
    handleCompositionUpdate,
    handleCompositionEnd
  };
}

export { useInput };
//# sourceMappingURL=useInput.mjs.map
