<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nText, N8nSwitch } from '@n8n/design-system';import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_EPISODIC_MEMORY_CREDENTIAL_MODAL_KEY } from '../constants';
import type { AgentJsonConfig } from '../types';

const props = withDefaults(
	defineProps<{ config: AgentJsonConfig | null; disabled?: boolean; embedded?: boolean }>(),
	{
		disabled: false,
		embedded: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const uiStore = useUIStore();
const memory = computed(() => (props.config?.memory?.enabled ? props.config.memory : null));
const episodicMemory = computed(() => props.config?.memory?.episodicMemory ?? null);
const episodicMemoryEnabled = computed(
	() => memory.value !== null && episodicMemory.value?.enabled === true,
);
const episodicMemoryCredential = computed(() =>
	episodicMemory.value?.enabled === true ? episodicMemory.value.credential : null,
);	</div>
</template>

<style module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	height: 100%;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.titleGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

/* Scoped overlay — title group stays interactive so the heading and toggle can render. */
.container.disabled > :not(.titleGroup) {
	pointer-events: none;
	opacity: 0.6;
}

.inlineInput {
	width: 70px;
	text-align: center;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--hover);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	outline: none;
}

.inlineInput:focus {
	border-color: var(--background--brand);
}

.divider {
	border: none;
	border-top: var(--border);
	margin: var(--spacing--2xs) 0;
}
</style>
