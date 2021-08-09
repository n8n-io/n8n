<template functional>
  <component
    :is="$options.components.FontAwesomeIcon"
    :class="$style[`_${props.size}`]"
    :icon="props.icon"
    :spin="props.spin"
  />
</template>

<script lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

export default {
  name: "n8n-icon",
  components: {
    FontAwesomeIcon,
  },
  props: {
    icon: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      default: "md",
      validator: function (value: string): boolean {
        return ["sm", "md", "lg"].indexOf(value) !== -1;
      },
    },
    spin: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style lang="scss" module>
._sm {
  font-size: 0.85em;
  height: 0.85em;
  width: 0.85em !important;
}

._md {
  font-size: .95em;
  height: .95em;
  width: .95em !important;
}

._lg {
  font-size: 1.22em;
  height: 1.22em;
  width: 1.22em !important;
}
</style>
