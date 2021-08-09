<template>
  <table :class="$style.table">
    <tr v-for="c in classes" :key="c">
      <td>.{{ c }}{{ postfix ? postfix : "" }}</td>
      <td :class="$style[`${c}${postfix ? postfix : ''}`]">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse in
        luctus sapien, a suscipit neque.
      </td>
    </tr>
  </table>
</template>

<script lang="ts">
export default {
  name: "text-classes",
  data(): { observer: null | MutationObserver; classes: string[] } {
    return {
      observer: null as null | MutationObserver,
      classes: [
        "heading1",
        "heading2",
        "heading3",
        "heading4",
        "body-large",
        "body-medium",
        "body-small",
      ],
    };
  },
  props: {
    postfix: {
      type: String,
    },
  },
};
</script>

<style lang="scss" module>
@use "~/theme/src/common/typography.scss";

.table {
  text-align: center;
  color: var(--color-text-dark);

  * {
    padding-bottom: 1em;
  }
}
</style>
