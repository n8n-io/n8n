<template functional>
  <fragment>
    <el-tag
      v-if="props.type === 'danger'"
      type="danger"
      size="small"
      :class="$style['danger']"
    >
      {{ props.text }}
    </el-tag>
    <el-tag
      v-else-if="props.type === 'warning'"
      size="small"
      :class="$style['warning']"
    >
      {{ props.text }}
    </el-tag>
  </fragment>
</template>

<script lang="ts">
export default {
  props: ["text", "type"],
};
</script>

<style lang="scss" module>
.badge {
  font-size: 11px;
  line-height: 18px;
  max-height: 18px;
  font-weight: 400;
  display: flex;
  align-items: center;
  padding: 2px 4px;
}

.danger {
  composes: badge;
  color: $--version-card-security-badge-color;
  background-color: $--version-card-security-badge-background-color;
  border-color: $--version-card-security-badge-border-color;
}

.warning {
  composes: badge;
  background-color: $--version-card-breaking-change-background-color;
  color: $--version-card-breaking-change-color;
  border: none;
}
</style>