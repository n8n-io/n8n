import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { protoParams } from '@/features/projectSettingsPrototype/params';
import { can } from '@/features/projectSettingsPrototype/state/session';
import { projectPagePath, settingsEntry } from './model';
import { PROTO_MEMBERS_VIEW, PROTO_SETTINGS_PAGE_VIEW } from './useProtoChrome';

/**
 * Keeps the page on screen in step with the variant. The baseline has one
 * settings form at `/settings`; every other variant has a page per section.
 * Changing the variant while on one moves to its counterpart in the other.
 */
export function useProtoRouteSync() {
	const route = useRoute();
	const router = useRouter();

	watch(
		() => [route.name, route.params.projectId, protoParams.variant, protoParams.viewingAs] as const,
		([name, projectId, variant]) => {
			if (typeof projectId !== 'string') return;

			// Master's form has no "no access" state, so a role without settings gets the page that has.
			const opensForm = variant === 'baseline' && can('project:settings:view', protoParams);

			if (name === VIEWS.PROJECT_SETTINGS && !opensForm) {
				const entry =
					settingsEntry(projectId, protoParams) ?? projectPagePath(projectId, 'general');
				void router.replace(entry);
				return;
			}

			const onProtoPage = name === PROTO_SETTINGS_PAGE_VIEW || name === PROTO_MEMBERS_VIEW;
			if (onProtoPage && opensForm) {
				void router.replace({ name: VIEWS.PROJECT_SETTINGS, params: { projectId } });
			}
		},
		{ immediate: true },
	);
}
