<script setup lang="ts">
import type { TaskBoardSeverity } from '@n8n/api-types';
import { N8nBadge } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { SEVERITY_BADGE_VARIANTS } from '../../task-board.constants';

defineProps<{ severity: TaskBoardSeverity }>();
const i18n = useI18n();
</script>

<template>
	<N8nBadge
		:variant="SEVERITY_BADGE_VARIANTS[severity]"
		size="xsmall"
		:data-severity="severity"
		data-test-id="task-board-severity-badge"
	>
		{{ i18n.baseText(`taskBoard.severity.${severity}`) }}
	</N8nBadge>
</template>
