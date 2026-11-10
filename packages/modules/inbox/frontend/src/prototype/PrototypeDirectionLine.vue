<script setup lang="ts">
import { N8nAssistantAvatar, N8nAvatar, N8nLink, N8nText } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { I18nT } from 'vue-i18n';

import { formatUserDisplayName } from '../reviews/workflowReviews.utils';
import { prototypeSession } from './prototype.session';

/** A workflow name in the subline. The id is absent until the detail payload includes it. */
export type PrototypeDirectionResource = {
	keypath: 'inbox.prototype.direction.publish' | 'inbox.prototype.direction.fix';
	resourceName: string;
	workflowId: string | null;
};

/** An environment name. It stays text. */
export type PrototypeDirectionEnvironment = {
	keypath: 'inbox.prototype.direction.promote';
	environment: string;
};

export type PrototypeDirection = PrototypeDirectionResource | PrototypeDirectionEnvironment;

const props = defineProps<{
	actor:
		| { kind: 'assistant' }
		| {
				kind: 'person';
				firstName: string | null;
				lastName: string | null;
				email?: string | null;
		  }
		| null;
	direction: PrototypeDirection | null;
}>();

const i18n = useI18n();

const showLine = computed(
	() => prototypeSession.active && props.actor !== null && !!props.direction,
);

const name = computed(() => {
	if (props.actor?.kind === 'assistant') {
		return i18n.baseText('inbox.selfHealing.metadata.assistant');
	}
	if (props.actor?.kind === 'person') return formatUserDisplayName(props.actor);
	return '';
});

const linkedResource = computed(() =>
	props.direction && 'resourceName' in props.direction ? props.direction : null,
);

const linePrefix = computed(() => (name.value ? `${name.value} · ` : ''));
</script>

<template>
	<div :class="showLine ? $style.stack : $style.passthrough">
		<slot />
		<div
			v-if="showLine && actor && direction"
			:class="$style.line"
			data-test-id="inbox-prototype-direction"
		>
			<span :class="$style.avatar">
				<N8nAssistantAvatar v-if="actor.kind === 'assistant'" size="mini" />
				<N8nAvatar
					v-else
					size="xxsmall"
					:first-name="actor.firstName ?? ''"
					:last-name="actor.lastName ?? ''"
				/>
			</span>
			<N8nText size="small" color="text-light" :class="$style.text">
				{{ linePrefix
				}}<I18nT :keypath="direction.keypath" tag="span" scope="global">
					<template v-if="linkedResource" #resource>
						<N8nLink
							v-if="linkedResource.workflowId"
							:to="{
								name: VIEWS.WORKFLOW,
								params: { workflowId: linkedResource.workflowId },
							}"
							theme="text"
							size="small"
							:underline="false"
							:class="$style.resourceLink"
							data-test-id="inbox-prototype-direction-resource"
						>
							{{ linkedResource.resourceName }}
						</N8nLink>
						<template v-else>{{ linkedResource.resourceName }}</template>
					</template>
					<template v-else #environment>{{
						'environment' in direction ? direction.environment : ''
					}}</template>
				</I18nT>
			</N8nText>
		</div>
	</div>
</template>

<style module lang="scss">
/* Hide this wrapper from layout so the product title stays in its flex row. */
.passthrough {
	display: contents;
}

.stack {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--4xs);
	min-width: 0;
	max-width: 100%;
}

.line {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	max-width: 100%;
}

/* Keep the avatar on the text line. A text line box would drop it. */
.avatar {
	display: inline-flex;
	flex-shrink: 0;
	line-height: 0;
}

.text {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Same as the self-healing metadata links: plain, then an underline on hover. */
.resourceLink:hover,
.resourceLink:focus-visible {
	text-decoration: underline;
}
</style>
