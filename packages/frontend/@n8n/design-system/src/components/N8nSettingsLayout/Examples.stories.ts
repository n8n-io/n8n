import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ElNotification } from 'element-plus';
import {
	computed,
	defineComponent,
	markRaw,
	onBeforeUnmount,
	onMounted,
	ref,
	useId,
	type Component,
	type PropType,
} from 'vue';

import N8nSettingsLayout from './SettingsLayout.vue';
import N8nCheckbox from '../../v2/components/Checkbox/Checkbox.vue';
import N8nAvatar from '../N8nAvatar';
import N8nBadge from '../N8nBadge';
import N8nButton from '../N8nButton';
import N8nDataTableServer from '../N8nDataTableServer';
import {
	N8nDialog,
	N8nDialogClose,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
} from '../N8nDialog';
import { N8nDropdownMenu } from '../N8nDropdownMenu';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import N8nInput from '../N8nInput';
import N8nOption from '../N8nOption';
import N8nRadioButtons from '../N8nRadioButtons';
import N8nSelect from '../N8nSelect';
import N8nSettingsPageHeader from '../N8nSettingsPageHeader';
import N8nSettingsRow from '../N8nSettingsRow';
import N8nSettingsRowConfigure from '../N8nSettingsRowConfigure';
import N8nSettingsRowGroup from '../N8nSettingsRowGroup';
import N8nSettingsSaveBar from '../N8nSettingsSaveBar';
import N8nSettingsSection from '../N8nSettingsSection';
import N8nSpinner from '../N8nSpinner';
import N8nSwitch from '../N8nSwitch';
import N8nText from '../N8nText';

const meta = {
	title: 'Instance Settings/Examples',
	component: N8nSettingsLayout,
	parameters: {
		docs: {
			description: {
				component:
					'Composed examples mirroring the Figma examples frame: a Security & login page (leading visual slot + merged sub-section), a This instance page (metrics custom row + back action), and an API keys page (full-width table beneath a header that stays centered in the 720px column). The **Example Settings Page** wires the floating `N8nSettingsSaveBar` to a realistic dirty-state flow — editing a high-impact field slides the bar up, Discard reverts and Save confirms through the existing app notification (the bottom-right `ElNotification` that `useToast()` shows in the app), while a low-impact toggle saves instantly. The **Model Context Protocol** set re-expresses the instance-level MCP page in the native settings system as a small page family: the main **Instance level MCP** page enables/disables the server through a single **MCP status** status-action control (a red-dot "Enable" button when off; a green pulsing-dot "Enabled" dropdown whose danger "Disable" item opens an `N8nDialog` confirmation when on) rather than a toggle — collapsing to a dashed-border empty state while disabled — and folds the **Connection details** inline as a client-led flow (a searchable, three-category "Client" picker that drives a dividerless group of official `N8nSettingsRow`s whose copyable values use `CopyInput` (readonly `N8nInput` + copy button): CLI Install/Configure/Authenticate, a web-client one-click "Add to …" row, or IDE deep-link + Server URL/token/Configure rows), then routes Access to a save-gated **MCP Permissions** sub-page (standard `N8nCheckbox` groups) and a **MCP Workflows available** sub-page (a group-by table grouping workflows by project, with an exposure filter and multi-select bulk expose/hide), and previews **MCP Connected clients** with a full `N8nDataTableServer` sub-page. Access is granted **per connected client** (like PostHog\'s "Connected applications"), mocking the real OAuth handoff: the footerless Connect dialog covers setup only, and **closing it** opens the standalone **McpAuthorize** story in a **new tab** — n8n\'s authorization screen (client mark ┈ n8n mark connection visual, "<client> wants access to your n8n instance", the shared tool catalog as a grouped checkbox list with read-only pre-checked and write/execute opt-in, Allow/Deny ending in OAuth-callback-style granted/denied states); both connected-clients surfaces render each grant as muted **plain truncated text** ("List workflows, Get workflow details +5" — never chips) that opens a **client details dialog** (brand mark + name, Connected by / Connected on / Last active, the full grant grouped by tool type, and a destructive Revoke access).',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

// Change confirmations reuse n8n's existing app-wide notification — the bottom-right Element Plus
// notification themed by the design system's `notification.scss` (the same component
// `useToast().showMessage` shows in the app) — instead of introducing a new toast pattern. The
// prototypes call it exactly the way the app does on a successful save.
const confirmSaved = (title: string) =>
	ElNotification({ title, type: 'success', position: 'bottom-right' });

// The design system ships no per-IDE brand icons, so the official brand marks are inlined here as
// tiny presentational components, mirroring the same `1em`-sized SVG pattern so each tracks the
// adjacent menu label / `N8nIcon`. They are used nominatively to identify "connect to <IDE>"
// affordances (the Connect menu, the Connected clients table/preview). Each keeps its source
// `viewBox` so the aspect ratio is never distorted; pass a font-size token, e.g.
// `var(--font-size--md)`, to size them.
//
// Cursor — rendered in the brand near-black (`#26251e`) like the original mark (no `currentColor`),
// so it reads as the Cursor logo everywhere it appears (the Connect menu, the main page preview,
// and the Connected clients table cell). Source SVG: the official Cursor logomark.
const CursorLogo: Component = {
	name: 'CursorLogo',
	template: `
		<svg
			viewBox="0 0 466.73 532.09"
			aria-hidden="true"
			focusable="false"
			style="width: 1em; height: 1em; flex: 0 0 auto;"
		>
			<path
				fill="#26251e"
				d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z"
			/>
		</svg>
	`,
};

// Claude — the official Claude logomark in its brand coral (`#D97757`), the colorful version (not
// the monochrome one). Source path/viewBox: simple-icons `claude.svg`.
const ClaudeLogo: Component = {
	name: 'ClaudeLogo',
	template: `
		<svg
			viewBox="0 0 24 24"
			aria-hidden="true"
			focusable="false"
			style="width: 1em; height: 1em; flex: 0 0 auto;"
		>
			<path
				fill="#D97757"
				d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"
			/>
		</svg>
	`,
};

// Codex — a faithful inline rendition of the actual Codex app icon (not the generic OpenAI
// blossom): the scalloped "blossom" silhouette filled with the app's purple→blue vertical gradient,
// with the white terminal-prompt glyph on top (a `>` chevron + an `_` underscore). Authored by hand
// as a small SVG — overlapping petal circles for the blossom plus two stroked glyph paths — so it
// stays crisp and token-sized like the other menu marks and carries its own colours (no
// `currentColor`). Used nominatively to mark the "connect to Codex" menu item.
const CodexLogo: Component = {
	name: 'CodexLogo',
	template: `
		<svg
			viewBox="0 0 24 24"
			aria-hidden="true"
			focusable="false"
			style="width: 1em; height: 1em; flex: 0 0 auto;"
		>
			<defs>
				<linearGradient id="codex-blossom-gradient" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#9C8CFF" />
					<stop offset="1" stop-color="#3A45F5" />
				</linearGradient>
			</defs>
			<g fill="url(#codex-blossom-gradient)">
				<circle cx="12" cy="12" r="5" />
				<circle cx="12" cy="7.4" r="4.4" />
				<circle cx="15.6" cy="9.13" r="4.4" />
				<circle cx="16.48" cy="13.02" r="4.4" />
				<circle cx="14" cy="16.14" r="4.4" />
				<circle cx="10" cy="16.14" r="4.4" />
				<circle cx="7.52" cy="13.02" r="4.4" />
				<circle cx="8.4" cy="9.13" r="4.4" />
			</g>
			<path d="M9 8.4 L12.9 12 L9 15.6" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
			<path d="M13.7 15.1 L17 15.1" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" />
		</svg>
	`,
};

// Gemini — Google's 2025 four-point concave "spark" mark, recreated as an inline sparkle path with a
// diagonal blue→purple→magenta gradient (`#4285F4` → `#9B72CB` → `#D96570`) approximating the official
// icon. Carries its own colours (no `currentColor`) and stays token-sized like the other menu marks.
// The gradient id is made unique per instance via Vue's `useId()` so multiple inlined copies never
// collide on a shared `url(#…)` reference. Used to mark the "Gemini CLI" client in the picker.
const GeminiLogo: Component = {
	name: 'GeminiLogo',
	setup() {
		const gradientId = `gemini-spark-${useId()}`;
		return { gradientId };
	},
	template: `
		<svg
			viewBox="0 0 24 24"
			aria-hidden="true"
			focusable="false"
			style="width: 1em; height: 1em; flex: 0 0 auto;"
		>
			<defs>
				<linearGradient :id="gradientId" x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#4285F4" />
					<stop offset="0.5" stop-color="#9B72CB" />
					<stop offset="1" stop-color="#D96570" />
				</linearGradient>
			</defs>
			<path :fill="'url(#' + gradientId + ')'" d="M12 1 Q12 12 23 12 Q12 12 12 23 Q12 12 1 12 Q12 12 12 1 Z" />
		</svg>
	`,
};

// VS Code — the official multi-tone "blue ribbon" logomark (`#0065A9` / `#007ACC` / `#1F9CF0`) drawn
// through the ribbon `mask`; the outer drop-shadow filters from the source asset are dropped so it
// stays a clean, token-sized brand mark. Source path/viewBox: the official VS Code logo SVG. Because
// the mark appears in several places at once (the Connect menu, the Connected clients table), the
// mask id is made unique per instance via Vue's `useId()` so multiple inlined copies never collide on
// a shared `url(#…)` reference.
const VsCodeLogo: Component = {
	name: 'VsCodeLogo',
	setup() {
		const maskId = `vscode-ribbon-${useId()}`;
		return { maskId };
	},
	template: `
		<svg
			viewBox="0 0 100 100"
			aria-hidden="true"
			focusable="false"
			style="width: 1em; height: 1em; flex: 0 0 auto;"
		>
			<mask :id="maskId" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100" style="mask-type: alpha;">
				<path fill-rule="evenodd" clip-rule="evenodd" d="M70.9119 99.3171C72.4869 99.9307 74.2828 99.8914 75.8725 99.1264L96.4608 89.2197C98.6242 88.1787 100 85.9892 100 83.5872V16.4133C100 14.0113 98.6243 11.8218 96.4609 10.7808L75.8725 0.873756C73.7862 -0.130129 71.3446 0.11638 69.5135 1.44995C69.252 1.64031 69.0028 1.85071 68.769 2.08086L29.3551 38.0383L12.1872 25.0029C10.589 23.7899 8.35363 23.8898 6.86933 25.2406L1.36303 30.2615C-0.452552 31.9159 -0.454633 34.7777 1.35853 36.4348L16.2471 50.0009L1.35853 63.5666C-0.454633 65.2237 -0.452552 68.0855 1.36303 69.7399L6.86933 74.7607C8.35363 76.1116 10.589 76.2115 12.1872 74.9985L29.3551 61.9628L68.769 97.9205C69.3925 98.5347 70.1246 98.9779 70.9119 99.3171ZM75.0152 27.2989L45.1091 50.0009L75.0152 72.7029V27.2989Z" fill="#ffffff" />
			</mask>
			<g :mask="'url(#' + maskId + ')'">
				<path d="M96.4614 10.7962L75.8569 0.875542C73.4719 -0.272773 70.6217 0.211611 68.75 2.08308L1.29834 63.5666C-0.515413 65.2231 -0.513168 68.0875 1.30348 69.7402L6.81188 74.7607C8.29723 76.1129 10.5338 76.2128 12.1331 74.9986L93.3609 13.3713C96.086 11.3072 100 13.2502 100 16.6651V16.4242C100 14.0247 98.6266 11.8364 96.4614 10.7962Z" fill="#0065A9" />
				<path d="M96.4614 89.2038L75.8569 99.1245C73.4719 100.273 70.6217 99.7884 68.75 97.9169L1.29834 36.4334C-0.515413 34.7769 -0.513168 31.9125 1.30348 30.2598L6.81188 25.2393C8.29723 23.8871 10.5338 23.7872 12.1331 25.0014L93.3609 86.6287C96.086 88.6928 100 86.7498 100 83.3349V83.5758C100 85.9753 98.6266 88.1636 96.4614 89.2038Z" fill="#007ACC" />
				<path d="M75.8578 99.1263C73.4721 100.274 70.6219 99.7885 68.75 97.9168C71.0564 100.223 75 98.5895 75 95.3278V4.67213C75 1.41039 71.0564 -0.222714 68.75 2.08312C70.6219 0.211423 73.4721 -0.273666 75.8578 0.873763L96.4587 10.7807C98.6243 11.8217 100 14.0112 100 16.4132V83.5868C100 85.9888 98.6243 88.1783 96.4587 89.2193L75.8578 99.1263Z" fill="#1F9CF0" />
			</g>
		</svg>
	`,
};

// OpenAI — the official "blossom" logomark in brand black, used for any ChatGPT / OpenAI client.
// Source path/viewBox: simple-icons \`openai.svg\`.
const OpenAiLogo: Component = {
	name: 'OpenAiLogo',
	template: `
		<svg
			viewBox="0 0 24 24"
			aria-hidden="true"
			focusable="false"
			style="width: 1em; height: 1em; flex: 0 0 auto;"
		>
			<path
				fill="#000000"
				d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"
			/>
		</svg>
	`,
};

// n8n — the official node-chain logomark in its brand raspberry (`#EA4B71`), inlined from the
// design system's `N8nLogo/logo-icon.svg` asset so the authorization screen (McpAuthorize) can
// render n8n itself as a connection endpoint tile opposite the requesting client's mark. Same 1em
// sizing convention as the client marks; the 32×26 viewBox keeps the mark's aspect ratio intact.
const N8nLogoMark: Component = {
	name: 'N8nLogoMark',
	template: `
		<svg
			viewBox="0 0 32 26"
			aria-hidden="true"
			focusable="false"
			style="width: 1em; height: 1em; flex: 0 0 auto;"
		>
			<path
				fill-rule="evenodd"
				clip-rule="evenodd"
				fill="#EA4B71"
				d="M27.2 11.3955C26.4903 11.3959 25.8006 11.1603 25.2394 10.7259C24.6783 10.2914 24.2774 9.68271 24.1 8.99555H20.433C20.0543 8.9956 19.6879 9.12999 19.3989 9.3748C19.11 9.61962 18.9173 9.95899 18.855 10.3325L18.723 11.1225C18.6018 11.8478 18.2346 12.5092 17.683 12.9955C18.2348 13.4821 18.6021 14.1439 18.723 14.8695L18.855 15.6585C18.9173 16.0321 19.11 16.3715 19.3989 16.6163C19.6879 16.8611 20.0543 16.9955 20.433 16.9955H20.901C21.0968 16.2424 21.5603 15.5864 22.2047 15.1502C22.8491 14.714 23.6303 14.5275 24.4023 14.6255C25.1743 14.7236 25.8841 15.0995 26.399 15.6829C26.9139 16.2663 27.1987 17.0174 27.2 17.7955C27.2015 18.5755 26.9182 19.3292 26.4031 19.9149C25.8881 20.5006 25.1769 20.8781 24.4031 20.9764C23.6294 21.0746 22.8464 20.8869 22.2013 20.4485C21.5562 20.0101 21.0935 19.3511 20.9 18.5955H20.433C19.6756 18.5954 18.9428 18.3267 18.3649 17.837C17.787 17.3474 17.4015 16.6687 17.277 15.9215L17.145 15.1325C17.0828 14.759 16.89 14.4196 16.6011 14.1748C16.3121 13.93 15.9457 13.7956 15.567 13.7955H14.299C14.1214 14.4823 13.7206 15.0907 13.1596 15.525C12.5987 15.9593 11.9094 16.1949 11.2 16.1949C10.4906 16.1949 9.80129 15.9593 9.24036 15.525C8.67943 15.0907 8.27866 14.4823 8.10101 13.7955H6.29901C6.1032 14.5487 5.63975 15.2047 4.99533 15.6409C4.35091 16.0771 3.56967 16.2636 2.7977 16.1656C2.02573 16.0675 1.31592 15.6916 0.800999 15.1082C0.286083 14.5247 0.00133389 13.7737 6.20563e-06 12.9955C-0.00152906 12.2156 0.281849 11.4619 0.796882 10.8762C1.31191 10.2905 2.02314 9.91299 2.79689 9.81474C3.57064 9.71649 4.35363 9.90421 4.99871 10.3426C5.6438 10.781 6.10655 11.44 6.30001 12.1955H8.10001C8.27697 11.5079 8.67758 10.8985 9.23878 10.4635C9.79998 10.0284 10.4899 9.79229 11.2 9.79229C11.9101 9.79229 12.6 10.0284 13.1612 10.4635C13.7224 10.8985 14.123 11.5079 14.3 12.1955H15.567C15.9457 12.1955 16.3121 12.0611 16.6011 11.8163C16.89 11.5715 17.0828 11.2321 17.145 10.8585L17.277 10.0685C17.4017 9.32161 17.7873 8.64311 18.3652 8.15368C18.943 7.66425 19.6757 7.39562 20.433 7.39555H24.101C24.2968 6.64242 24.7603 5.9864 25.4047 5.5502C26.0491 5.114 26.8303 4.92747 27.6023 5.02552C28.3743 5.12356 29.0841 5.49945 29.599 6.0829C30.1139 6.66634 30.3987 7.41738 30.4 8.19555C30.4 9.04424 30.0629 9.85817 29.4627 10.4583C28.8626 11.0584 28.0487 11.3955 27.2 11.3955ZM27.2 9.79555C27.6244 9.79555 28.0313 9.62698 28.3314 9.32692C28.6314 9.02686 28.8 8.61989 28.8 8.19555C28.8 7.7712 28.6314 7.36423 28.3314 7.06418C28.0313 6.76412 27.6244 6.59555 27.2 6.59555C26.7757 6.59555 26.3687 6.76412 26.0686 7.06418C25.7686 7.36423 25.6 7.7712 25.6 8.19555C25.6 8.61989 25.7686 9.02686 26.0686 9.32692C26.3687 9.62698 26.7757 9.79555 27.2 9.79555ZM3.20001 14.5955C3.62435 14.5955 4.03132 14.427 4.33138 14.1269C4.63144 13.8269 4.80001 13.4199 4.80001 12.9955C4.80001 12.5712 4.63144 12.1642 4.33138 11.8642C4.03132 11.5641 3.62435 11.3955 3.20001 11.3955C2.77566 11.3955 2.36869 11.5641 2.06864 11.8642C1.76858 12.1642 1.60001 12.5712 1.60001 12.9955C1.60001 13.4199 1.76858 13.8269 2.06864 14.1269C2.36869 14.427 2.77566 14.5955 3.20001 14.5955ZM12.8 12.9955C12.8 13.2057 12.7586 13.4137 12.6782 13.6078C12.5978 13.802 12.48 13.9783 12.3314 14.1269C12.1828 14.2755 12.0064 14.3933 11.8123 14.4738C11.6182 14.5542 11.4101 14.5955 11.2 14.5955C10.9899 14.5955 10.7818 14.5542 10.5877 14.4738C10.3936 14.3933 10.2172 14.2755 10.0686 14.1269C9.92006 13.9783 9.80221 13.802 9.7218 13.6078C9.64139 13.4137 9.60001 13.2057 9.60001 12.9955C9.60001 12.5712 9.76858 12.1642 10.0686 11.8642C10.3687 11.5641 10.7757 11.3955 11.2 11.3955C11.6244 11.3955 12.0313 11.5641 12.3314 11.8642C12.6314 12.1642 12.8 12.5712 12.8 12.9955ZM25.6 17.7955C25.6 18.0057 25.5586 18.2137 25.4782 18.4078C25.3978 18.602 25.28 18.7783 25.1314 18.9269C24.9828 19.0755 24.8064 19.1933 24.6123 19.2738C24.4182 19.3542 24.2101 19.3955 24 19.3955C23.7899 19.3955 23.5818 19.3542 23.3877 19.2738C23.1936 19.1933 23.0172 19.0755 22.8686 18.9269C22.7201 18.7783 22.6022 18.602 22.5218 18.4078C22.4414 18.2137 22.4 18.0057 22.4 17.7955C22.4 17.3712 22.5686 16.9642 22.8686 16.6642C23.1687 16.3641 23.5757 16.1955 24 16.1955C24.4244 16.1955 24.8313 16.3641 25.1314 16.6642C25.4314 16.9642 25.6 17.3712 25.6 17.7955Z"
			/>
		</svg>
	`,
};

// Maps a connected-client id to its inlined brand mark, reused by the main-page preview and the full
// Connected clients table; anything unmapped falls back to the client's DS icon. `markRaw` keeps the
// component objects from being wrapped in a reactive proxy when handed to `<component :is>`.
// `claude-ai` shares the Claude mark so a newly-authorized Claude.ai connection renders it too.
const clientLogoComponents = markRaw<Record<string, Component>>({
	cursor: CursorLogo,
	claude: ClaudeLogo,
	'claude-ai': ClaudeLogo,
	codex: CodexLogo,
	gemini: GeminiLogo,
	vscode: VsCodeLogo,
	chatgpt: OpenAiLogo,
});

// Animated client-logo cluster for the MCP empty states, mimicking the External Secrets empty
// state (n8n PR #24685): a fanned trio of small bordered cards — the outer two tilted ±8°, the
// centre one raised and on top — where the static centre card carries the feature's own DS icon
// (`icon` prop) and the two side cards cycle through the MCP client brand marks (Claude, VS Code,
// Codex, Cursor, Gemini, ChatGPT/OpenAI) with the PR's staggered fade+blur swap: every 3s the left
// card fades out (300ms opacity+blur), swaps to the next mark, and fades back in; the right card
// does the same 1.5s later. The right side starts halfway around the cycle so the two sides never
// show the same mark at once. Story render templates can't carry scoped CSS, so the card/transition
// rules are injected once into the head (guarded by a fixed id), mirroring the StatusDot injection.
// Honors `prefers-reduced-motion` by skipping the cycling entirely (two static marks, no fade).
// Purely decorative, so the whole cluster is `aria-hidden`.
const MCP_LOGO_CARDS_STYLE_ID = 'mcp-logo-cards-styles';
const LOGO_CARDS_FADE_MS = 300;
const LOGO_CARDS_STAGGER_MS = 1500;
const LOGO_CARDS_CYCLE_MS = 3000;
// Cycling order for the side cards, interleaved so consecutive marks read clearly different
// (coral wordmark → blue ribbon → purple blossom → near-black → gradient spark → black blossom).
const logoCardsCycle = markRaw<Component[]>([
	ClaudeLogo,
	VsCodeLogo,
	CodexLogo,
	CursorLogo,
	GeminiLogo,
	OpenAiLogo,
]);
const ClientLogoCards = defineComponent({
	name: 'ClientLogoCards',
	components: { N8nIcon },
	props: {
		// The static centre mark, naming the feature the empty state belongs to.
		icon: { type: String as PropType<IconName>, default: 'mcp' },
	},
	setup() {
		if (typeof document !== 'undefined' && !document.getElementById(MCP_LOGO_CARDS_STYLE_ID)) {
			const style = document.createElement('style');
			style.id = MCP_LOGO_CARDS_STYLE_ID;
			style.textContent =
				'.mcp-logo-cards { display: flex; align-items: center; justify-content: center; }' +
				// The card's font-size sizes both the 1em brand marks and the (sizeless) centre N8nIcon.
				'.mcp-logo-cards__card { display: flex; align-items: center; justify-content: center; flex: 0 0 auto; width: calc(var(--spacing--md) * 2); height: calc(var(--spacing--md) * 2); border: var(--border-width, 1px) solid var(--border-color--subtle); border-radius: var(--radius--xs); background: var(--background--surface); box-shadow: var(--shadow--xs); overflow: hidden; font-size: var(--font-size--xl); color: var(--text-color--subtle); }' +
				'.mcp-logo-cards__card:nth-child(1) { transform: rotate(-8deg); }' +
				'.mcp-logo-cards__card:nth-child(2) { z-index: 1; transform: translateY(calc(-1 * var(--spacing--4xs))); }' +
				'.mcp-logo-cards__card:nth-child(3) { transform: rotate(8deg); }' +
				`.mcp-logo-cards__logo { display: inline-flex; opacity: 1; filter: blur(0); transition: opacity ${LOGO_CARDS_FADE_MS}ms ease-in-out, filter ${LOGO_CARDS_FADE_MS}ms ease-in-out; }` +
				'.mcp-logo-cards__logo--fading { opacity: 0; filter: blur(4px); }' +
				'@media (prefers-reduced-motion: reduce) { .mcp-logo-cards__logo { transition: none; } }';
			document.head.appendChild(style);
		}

		const logos = logoCardsCycle;
		const leftIndex = ref(0);
		const rightIndex = ref(Math.floor(logos.length / 2));
		const leftFading = ref(false);
		const rightFading = ref(false);

		// Fade out → swap the mark mid-fade → fade back in (the swap timeout matches the CSS fade).
		let cycleTimer = 0;
		let staggerTimer = 0;
		let leftSwapTimer = 0;
		let rightSwapTimer = 0;
		const swapLeft = () => {
			leftFading.value = true;
			leftSwapTimer = window.setTimeout(() => {
				leftIndex.value = (leftIndex.value + 1) % logos.length;
				leftFading.value = false;
			}, LOGO_CARDS_FADE_MS);
		};
		const swapRight = () => {
			rightFading.value = true;
			rightSwapTimer = window.setTimeout(() => {
				rightIndex.value = (rightIndex.value + 1) % logos.length;
				rightFading.value = false;
			}, LOGO_CARDS_FADE_MS);
		};

		onMounted(() => {
			const reduceMotion =
				typeof window.matchMedia === 'function' &&
				window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			if (reduceMotion) return;
			cycleTimer = window.setInterval(() => {
				swapLeft();
				staggerTimer = window.setTimeout(swapRight, LOGO_CARDS_STAGGER_MS);
			}, LOGO_CARDS_CYCLE_MS);
		});
		onBeforeUnmount(() => {
			window.clearInterval(cycleTimer);
			window.clearTimeout(staggerTimer);
			window.clearTimeout(leftSwapTimer);
			window.clearTimeout(rightSwapTimer);
		});

		return { logos, leftIndex, rightIndex, leftFading, rightFading };
	},
	template: `
		<div class="mcp-logo-cards" aria-hidden="true">
			<div class="mcp-logo-cards__card">
				<span class="mcp-logo-cards__logo" :class="{ 'mcp-logo-cards__logo--fading': leftFading }">
					<component :is="logos[leftIndex]" />
				</span>
			</div>
			<div class="mcp-logo-cards__card">
				<N8nIcon :icon="icon" color="text-light" />
			</div>
			<div class="mcp-logo-cards__card">
				<span class="mcp-logo-cards__logo" :class="{ 'mcp-logo-cards__logo--fading': rightFading }">
					<component :is="logos[rightIndex]" />
				</span>
			</div>
		</div>
	`,
});

// Small status dot used by the "Enable MCP access" control: solid when disabled (red), gently pulsing
// when enabled (green). Story `render()` templates can't carry a scoped `<style>`, so the pulse
// `@keyframes` are injected into `document.head` exactly once (guarded by a fixed id) the first time a
// dot mounts; the animation itself is applied inline and is skipped when the user prefers reduced
// motion. The glow tracks the dot's own colour via `currentColor`, so it stays token-driven.
const STATUS_DOT_KEYFRAMES_ID = 'mcp-status-dot-pulse-keyframes';
const StatusDot = defineComponent({
	name: 'StatusDot',
	props: {
		color: { type: String, required: true },
		pulse: { type: Boolean, default: false },
	},
	setup(props) {
		if (typeof document !== 'undefined' && !document.getElementById(STATUS_DOT_KEYFRAMES_ID)) {
			const style = document.createElement('style');
			style.id = STATUS_DOT_KEYFRAMES_ID;
			style.textContent =
				'@keyframes mcp-status-dot-pulse {' +
				'0% { box-shadow: 0 0 0 0 currentColor; }' +
				'70% { box-shadow: 0 0 0 var(--spacing--2xs) transparent; }' +
				'100% { box-shadow: 0 0 0 0 transparent; }' +
				'}';
			document.head.appendChild(style);
		}
		const reduceMotion =
			typeof window !== 'undefined' && typeof window.matchMedia === 'function'
				? window.matchMedia('(prefers-reduced-motion: reduce)').matches
				: false;
		const dotStyle = computed(() => ({
			display: 'inline-block',
			width: 'var(--spacing--2xs)',
			height: 'var(--spacing--2xs)',
			borderRadius: 'var(--radius--full)',
			background: props.color,
			color: props.color,
			flex: '0 0 auto',
			animation:
				props.pulse && !reduceMotion ? 'mcp-status-dot-pulse 2s ease-out infinite' : undefined,
		}));
		return { dotStyle };
	},
	template: '<span aria-hidden="true" :style="dotStyle"></span>',
});

// Entrance animation for the MCP page's enable/disable swap (the empty state ⇄ full page). Story
// render templates can't carry scoped CSS, so the keyframes + class are injected once into the head
// (guarded by a fixed id), mirroring the StatusDot pulse injection. Honors reduced-motion.
const MCP_REVEAL_STYLE_ID = 'mcp-reveal-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(MCP_REVEAL_STYLE_ID)) {
	const revealStyle = document.createElement('style');
	revealStyle.id = MCP_REVEAL_STYLE_ID;
	revealStyle.textContent =
		'@keyframes mcp-reveal-in { from { opacity: 0; transform: translateY(var(--spacing--2xs)); } to { opacity: 1; transform: translateY(0); } }' +
		'.mcp-reveal { animation: mcp-reveal-in var(--duration--base, 240ms) var(--easing--ease-out, ease-out); }' +
		'@media (prefers-reduced-motion: reduce) { .mcp-reveal { animation: none; } }';
	document.head.appendChild(revealStyle);
}

// Pixel-fidelity overrides for the single-line CopyInput so the `#append` copy button reads as one
// continuous bordered field split by a single thin divider (matching the target design), instead of
// the DS default (detached grey `neutral-150` tab with a container gutter). Story render templates
// can't carry scoped CSS, so the rules are injected once into the head (guarded by a fixed id),
// mirroring the StatusDot / mcp-reveal injection, and are scoped under the unique
// `.mcp-copy-input--inline` class (added only to the single-line variant) so they never leak to other
// inputs or to the multiline textarea variant. The overrides: move the border + radius + near-white
// background (`--input--color--background`) onto the CONTAINER with `overflow: hidden` (the one outer
// field); drop the wrapper's own border so it doesn't double up; collapse the container `gap` to 0;
// and make the append segment transparent (so the near-white shows through) keeping only a single
// `border-left: var(--border)` divider, with its grey background and negative margins/padding zeroed.
// The append element is reached via the stable global `.n8n-input__wrapper + span` (the append is the
// span immediately after the wrapper), avoiding the hashed CSS-module class names.
const MCP_COPY_INPUT_STYLE_ID = 'mcp-copy-input-styles';
if (typeof document !== 'undefined' && !document.getElementById(MCP_COPY_INPUT_STYLE_ID)) {
	const copyStyle = document.createElement('style');
	copyStyle.id = MCP_COPY_INPUT_STYLE_ID;
	copyStyle.textContent =
		'.mcp-copy-input--inline { gap: 0; border-radius: var(--input--radius); background-color: var(--input--color--background); box-shadow: inset var(--input--border--shadow); overflow: hidden; }' +
		'.mcp-copy-input--inline .n8n-input__wrapper { box-shadow: none; background-color: transparent; }' +
		'.mcp-copy-input--inline .n8n-input__wrapper + span { background-color: transparent; border-left: var(--border); margin: 0; padding: 0; }';
	document.head.appendChild(copyStyle);
}

// Connect dialog body scroll: the dialog can grow taller than the viewport for tall clients (e.g.
// Claude Code's big config block). Cap the BODY (the settings-row group wrapper) to a viewport-
// relative max-height and let only it scroll, so the dialog's header ("Connect a client") stays
// pinned and the content never runs off-screen. The reserve (~16rem) leaves room for the
// header + dialog padding plus a comfortable top/bottom gutter. AutoHeight still animates
// the body's inner height; once it exceeds the cap, this container scrolls instead of pushing the
// dialog off-screen. Scoped under the unique `.mcp-connect-dialog` class so no other N8nDialog is
// affected. Injected once into the head (guarded by a fixed id), mirroring the injections above.
const MCP_CONNECT_DIALOG_STYLE_ID = 'mcp-connect-dialog-styles';
if (typeof document !== 'undefined' && !document.getElementById(MCP_CONNECT_DIALOG_STYLE_ID)) {
	const dialogStyle = document.createElement('style');
	dialogStyle.id = MCP_CONNECT_DIALOG_STYLE_ID;
	dialogStyle.textContent =
		'.mcp-connect-dialog { max-height: calc(100dvh - 16rem); overflow-y: auto; }';
	document.head.appendChild(dialogStyle);
}

// Reusable copyable value for the client-led Connection details setup: the official `N8nInput`
// (readonly, monospace) with an icon-only copy `N8nButton` in the input's `#append` slot. For the
// single-line variant the append renders as an attached, full-input-height button segment flush at
// the right edge with a single `border-left: var(--border)` divider separating it from the value, and
// the near-white field background carried by the container (see the injected `.mcp-copy-input--inline`
// overrides above) so the button face matches the input body — one continuous bordered field. The
// button is `size="medium"` so it fills the segment height (square, centered icon). `multiline`
// switches to a readonly autosizing `textarea` for the JSON/TOML config snippets and puts the copy
// button in the `#suffix` slot — for textareas the input wrapper is top-aligned, so the small button
// sits in the top-right corner rather than as a broken full-height grey bar. It is presentational: the
// Copy button emits `copy` with the value and the page owns the clipboard write + the contextual
// confirmation (all copies confirm through the shared app notification). Monospace is applied to the
// container so the inherited input/textarea text is monospaced without hardcoding sizes.
const CopyInput = defineComponent({
	name: 'CopyInput',
	components: { N8nInput, N8nButton },
	props: {
		value: { type: String, required: true },
		multiline: { type: Boolean, default: false },
		ariaLabel: { type: String, default: 'Copy' },
	},
	emits: ['copy'],
	setup(props, { emit }) {
		const monoStyle = { fontFamily: 'var(--font-family--monospace)', width: '100%' };
		const onCopy = () => emit('copy', props.value);
		return { monoStyle, onCopy };
	},
	template: `
		<N8nInput
			:model-value="value"
			:type="multiline ? 'textarea' : 'text'"
			:autosize="multiline ? { minRows: 3, maxRows: 14 } : false"
			size="medium"
			readonly
			:class="['mcp-copy-input', { 'mcp-copy-input--inline': !multiline }]"
			:style="monoStyle"
		>
			<template v-if="multiline" #suffix>
				<N8nButton variant="ghost" size="small" icon-only icon="copy" :aria-label="ariaLabel" @click="onCopy" />
			</template>
			<template v-else #append>
				<N8nButton variant="ghost" size="medium" icon-only icon="copy" :aria-label="ariaLabel" @click="onCopy" />
			</template>
		</N8nInput>
	`,
});

// Branded "Add to <client>" one-click button used by the Web Clients (Add to ChatGPT / Claude.ai)
// and IDE (Add to Cursor / VS Code) setups. Modelled on the reference's black branded button: a
// dark pill with the client's brand mark + label that links out (a deep link for IDEs, a connector
// URL for web clients). The leading slot receives the client's colored brand mark; on the dark pill
// it is flattened to white via `filter: brightness(0) invert(1)` so a single mark works on black
// without shipping a separate white asset. The brand black + white are intentional brand colours
// (like the inlined logos), with everything else token-driven. The hover rule is injected once
// (story render templates can't carry scoped CSS), mirroring the StatusDot keyframe injection.
const BRAND_BUTTON_STYLE_ID = 'mcp-brand-button-styles';
const BrandButton = defineComponent({
	name: 'BrandButton',
	props: {
		label: { type: String, required: true },
		href: { type: String, required: true },
	},
	setup() {
		if (typeof document !== 'undefined' && !document.getElementById(BRAND_BUTTON_STYLE_ID)) {
			const style = document.createElement('style');
			style.id = BRAND_BUTTON_STYLE_ID;
			style.textContent =
				'.mcp-brand-button { transition: opacity 0.15s ease-in-out; }' +
				'.mcp-brand-button:hover { opacity: 0.88; }' +
				'.mcp-brand-button:focus-visible { outline: var(--focus--border-width, 2px) solid var(--focus--border-color); outline-offset: 2px; }';
			document.head.appendChild(style);
		}
	},
	template: `
		<a
			class="mcp-brand-button"
			:href="href"
			target="_blank"
			rel="noopener noreferrer"
			style="display: inline-flex; align-items: center; gap: var(--spacing--2xs); width: fit-content; padding: var(--spacing--2xs) var(--spacing--sm); border-radius: var(--radius); background: #0d0d0d; color: #ffffff; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold); line-height: var(--line-height--lg); text-decoration: none; cursor: pointer;"
		>
			<span style="display: inline-flex; align-items: center; justify-content: center; font-size: var(--font-size--md); filter: brightness(0) invert(1);">
				<slot name="leading" />
			</span>
			<span>{{ label }}</span>
		</a>
	`,
});

// Smoothly animates its own height when its slotted content changes height — used to wrap the
// per-client setup rows revealed inside the "Your client" expandable row. The DS `N8nSettingsRow`
// expand animates the open/close (grid 0fr↔1fr), but once open the track is effectively `auto`, so
// swapping to a client whose setup is a different height would SNAP. A `ResizeObserver` watches the
// content; when the height changes between two NON-ZERO heights (i.e. a client switch, not the
// initial fill or a clear-to-empty, which the parent row already animates) it locks the old height,
// then transitions to the new one reusing the row's exact expand curve (350ms / cubic-bezier(0.32,
// 0.72, 0, 1)), and finally restores `height: auto` so dynamic content (the autosize config textarea)
// is never clipped at rest. Honors `prefers-reduced-motion` by jumping instantly.
const AUTO_HEIGHT_DURATION = 350;
const AUTO_HEIGHT_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const AutoHeight = defineComponent({
	name: 'AutoHeight',
	setup() {
		const wrapper = ref<HTMLElement | null>(null);
		let observer: ResizeObserver | undefined;
		let lastHeight = 0;
		let endTimer = 0;

		const prefersReducedMotion = () =>
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		const clearPending = () => {
			if (endTimer) {
				window.clearTimeout(endTimer);
				endTimer = 0;
			}
		};

		const settle = (node: HTMLElement) => {
			node.style.transition = '';
			node.style.height = 'auto';
			node.style.overflow = '';
		};

		const animate = (node: HTMLElement, from: number, to: number) => {
			clearPending();
			node.style.overflow = 'hidden';
			node.style.height = `${from}px`;
			// Force reflow so the from-height is committed before the transition starts.
			void node.offsetHeight;
			node.style.transition = `height ${AUTO_HEIGHT_DURATION}ms ${AUTO_HEIGHT_EASING}`;
			node.style.height = `${to}px`;
			const onEnd = (event: TransitionEvent) => {
				if (event.target !== node || event.propertyName !== 'height') return;
				node.removeEventListener('transitionend', onEnd);
				clearPending();
				settle(node);
			};
			node.addEventListener('transitionend', onEnd);
			// Fallback in case transitionend doesn't fire (e.g. height delta rounds to 0).
			endTimer = window.setTimeout(() => {
				node.removeEventListener('transitionend', onEnd);
				settle(node);
				endTimer = 0;
			}, AUTO_HEIGHT_DURATION + 80);
		};

		onMounted(() => {
			const node = wrapper.value;
			if (!node) return;
			lastHeight = node.offsetHeight;
			if (typeof ResizeObserver === 'undefined') return;
			observer = new ResizeObserver(() => {
				const el = wrapper.value;
				if (!el) return;
				// Ignore observations made while we're mid-animation (height is pinned, not `auto`).
				if (el.style.height && el.style.height !== 'auto') return;
				const next = el.scrollHeight;
				const prev = lastHeight;
				if (next === prev) return;
				lastHeight = next;
				// Only animate height deltas between two real heights (a client switch). The initial
				// fill (0→h) and clear (h→0) are owned by the parent row's expand/collapse animation.
				if (prev > 0 && next > 0 && !prefersReducedMotion()) {
					animate(el, prev, next);
				}
			});
			observer.observe(node);
		});

		onBeforeUnmount(() => {
			observer?.disconnect();
			clearPending();
		});

		return { wrapper };
	},
	template: '<div ref="wrapper"><slot /></div>',
});

const components = {
	CursorLogo,
	ClaudeLogo,
	CodexLogo,
	GeminiLogo,
	VsCodeLogo,
	OpenAiLogo,
	N8nLogoMark,
	ClientLogoCards,
	StatusDot,
	CopyInput,
	AutoHeight,
	BrandButton,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsSection,
	N8nSettingsRowGroup,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsSaveBar,
	N8nSpinner,
	N8nSwitch,
	N8nCheckbox,
	N8nButton,
	N8nAvatar,
	N8nBadge,
	N8nDialog,
	N8nDialogClose,
	N8nDialogFooter,
	N8nInput,
	N8nSelect,
	N8nOption,
	N8nRadioButtons,
	N8nIcon,
	N8nText,
	// Cast the generic data-table and dropdown menu to plain Components so their generic
	// signatures don't leak into (and break) the Storybook render-function types.
	N8nDataTableServer: N8nDataTableServer as unknown as Component,
	N8nDropdownMenu: N8nDropdownMenu as unknown as Component,
};

// Bordered, rounded metrics card mirroring the Settings Row `Custom` story: three equal columns
// (tiles) separated by vertical dividers, built from DS border/radius/spacing tokens. Each tile
// shows a metric title, a "Last 7 days" sublabel, the big bold value, and either a colored trend
// delta (success/danger) or the muted "/ unlimited" suffix. Iterates a `metrics` array from setup.
const metricTilesCard = `
	<div style="display: grid; grid-template-columns: repeat(3, 1fr); width: 100%; border: var(--border-width, 1px) solid var(--border-color--subtle); border-radius: var(--radius--xs); overflow: clip;">
		<div
			v-for="(metric, index) in metrics"
			:key="metric.title"
			:style="{
				display: 'flex',
				flexDirection: 'column',
				gap: 'var(--spacing--2xs)',
				padding: 'var(--spacing--sm)',
				borderInlineStart: index > 0 ? 'var(--border-width, 1px) solid var(--border-color--subtle)' : '',
			}"
		>
			<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs);">
				<N8nText size="small" color="text-base" tag="div">{{ metric.title }}</N8nText>
				<N8nText size="small" color="text-light" tag="div">Last 7 days</N8nText>
			</div>
			<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
				<N8nText size="xlarge" bold color="text-dark" tag="span">{{ metric.value }}</N8nText>
				<N8nText v-if="metric.suffix" size="small" color="text-light" tag="span">{{ metric.suffix }}</N8nText>
				<span v-else style="display: inline-flex; align-items: center; gap: var(--spacing--5xs);">
					<N8nIcon icon="triangle" :color="metric.delta" size="xsmall" />
					<N8nText size="small" :color="metric.delta" tag="span">{{ metric.deltaText }}</N8nText>
				</span>
			</div>
		</div>
	</div>
`;

export const SecurityAndLogin: Story = {
	render: () => ({
		components,
		setup() {
			const onBack = () => alert('Back to app');
			const onConfigurePasskey = () => alert('Configure passkeys');
			const onLogOut = () => alert('Log out');
			const onRevoke = () => alert('Revoke');
			return { onBack, onConfigurePasskey, onLogOut, onRevoke };
		},
		template: `
			<N8nSettingsLayout show-back back-label="Back to app" @back="onBack">
				<N8nSettingsPageHeader
					title="Security & login"
					description="Your 2FA setup, passkeys, active sessions, and authorized OAuth applications."
					docs-url="https://docs.n8n.io/user-management/"
				/>

				<N8nSettingsSection title="Sign-in" description="How you sign in to n8n.">
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="Username" description="Used in audit trails and @-mentions. Set by your admin via SSO.">
							<template #action><N8nInput size="medium" placeholder="jan.ostrowka" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Password" description="Last changed 4 months ago.">
							<template #action><N8nButton variant="outline" size="medium" label="Change password" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Passkey" description="Sign in with your face, fingerprint, or device PIN." clickable @click="onConfigurePasskey">
							<template #action><N8nSettingsRowConfigure value="2 of 3 devices" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>

				<N8nSettingsSection title="Active sessions" description="Devices currently signed in to your account.">
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="Chrome 138 on macOS" description="Gdynia, Poland · active now" show-visual hoverable reveal-actions-on-hover>
							<template #visual><N8nIcon icon="hard-drive" /></template>
							<template #action><N8nButton variant="outline" size="medium" label="Log out" @click="onLogOut" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="2 other active sessions">
							<template #action><N8nButton variant="outline" size="medium" label="Revoke all" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Safari on iPhone" description="Gdynia, Poland · last seen 4 hours ago" show-visual hoverable reveal-actions-on-hover>
							<template #visual><N8nIcon icon="globe" /></template>
							<template #action><N8nButton variant="outline" size="medium" label="Revoke" @click="onRevoke" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="n8n CLI" description="headless · last seen 3 days ago" show-visual hoverable reveal-actions-on-hover>
							<template #visual><N8nIcon icon="terminal" /></template>
							<template #action><N8nButton variant="outline" size="medium" label="Revoke" @click="onRevoke" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
			</N8nSettingsLayout>
		`,
	}),
};

export const PasskeysSubPage: Story = {
	render: () => ({
		components,
		setup() {
			// Nested sub-page: the back label names the parent page it returns to.
			const onBack = () => alert('Back to Security settings');
			const onAdd = () => alert('Add passkey');
			const onRemove = () => alert('Remove passkey');
			return { onBack, onAdd, onRemove };
		},
		template: `
			<N8nSettingsLayout show-back back-label="Back to Security settings" @back="onBack">
				<N8nSettingsPageHeader
					title="Passkeys"
					description="Manage the passkeys you use to sign in with your face, fingerprint, or device PIN."
					docs-url="https://docs.n8n.io/user-management/"
				/>

				<N8nSettingsSection>
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="Add a passkey" description="Register this device or a hardware security key." hoverable>
							<template #action><N8nButton variant="outline" size="medium" label="Add passkey" @click="onAdd" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="MacBook Pro" description="Added 3 months ago · last used 3 min ago" show-visual hoverable reveal-actions-on-hover>
							<template #visual><N8nIcon icon="hard-drive" /></template>
							<template #action><N8nButton variant="outline" size="medium" label="Remove" @click="onRemove" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="iPhone" description="Added 5 months ago · last used yesterday" show-visual hoverable reveal-actions-on-hover>
							<template #visual><N8nIcon icon="fingerprint" /></template>
							<template #action><N8nButton variant="outline" size="medium" label="Remove" @click="onRemove" /></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="YubiKey 5C" description="Added 1 year ago · last used last week" show-visual hoverable reveal-actions-on-hover>
							<template #visual><N8nIcon icon="key-round" /></template>
							<template #action><N8nButton variant="outline" size="medium" label="Remove" @click="onRemove" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
			</N8nSettingsLayout>
		`,
	}),
};

export const ThisInstance: Story = {
	render: () => ({
		components,
		setup() {
			const onBack = () => alert('Back');
			// `delta` drives the colored trend (success/danger); `suffix` is the muted
			// "/ unlimited" variant that has no trend arrow.
			const metrics = [
				{ title: 'Prod. executions', value: '23,432', delta: 'success', deltaText: '0.5pp' },
				{ title: 'Active workflows', value: '865', suffix: '/ unlimited' },
				{ title: 'Active users', value: '1.9%', delta: 'danger', deltaText: '0.5pp' },
			];
			return { onBack, metrics };
		},
		template: `
			<N8nSettingsLayout show-back @back="onBack">
				<N8nSettingsPageHeader
					title="This instance"
					description="Plan, usage, version, updates, instance details, resources, and support for this n8n instance."
					docs-url="https://docs.n8n.io"
				/>

				<N8nSettingsSection title="Plan and usage">
					<N8nSettingsRowGroup>
						<N8nSettingsRow layout="vertical" title="Usage">
							<template #action>${metricTilesCard}</template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Plan">
							<template #action><N8nText size="medium" color="text-dark">Enterprise</N8nText></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Billing">
							<template #action><N8nButton variant="outline" size="medium" label="Manage plan" /></template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>

				<N8nSettingsSection title="Version and updates">
					<N8nSettingsRowGroup>
						<N8nSettingsRow title="Current version">
							<template #action><N8nText size="medium" color="text-dark">2.9.4</N8nText></template>
						</N8nSettingsRow>
						<N8nSettingsRow title="Updates" description="2.10.2 available · 3 versions behind">
							<template #action>
								<div style="display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: var(--spacing--sm);">
									<a
										href="https://docs.n8n.io/release-notes"
										target="_blank"
										rel="noopener noreferrer"
										style="color: var(--text-color--subtle); font-size: var(--font-size--sm); line-height: var(--line-height--lg); text-decoration: none; cursor: pointer;"
									><span style="text-decoration: underline;">Release notes</span><span aria-hidden="true">↗</span></a>
									<N8nButton variant="outline" size="medium" label="Update" />
								</div>
							</template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
			</N8nSettingsLayout>
		`,
	}),
};

export const ApiKeys: Story = {
	render: () => ({
		components,
		setup() {
			const onBack = () => alert('Back');

			// Real n8n data-table headers: `key` maps to the item field; the trailing
			// `actions` column has no underlying data so it uses a value accessor.
			const headers = [
				{ title: 'Label', key: 'label' },
				{ title: 'API key', key: 'apiKey', disableSort: true },
				{ title: 'Created', key: 'created' },
				{ title: 'Last used', key: 'lastUsed' },
				{ title: '', key: 'actions', value: () => '', disableSort: true, align: 'end', width: 64 },
			];

			const items = [
				{
					id: '1',
					label: 'Production',
					apiKey: '••••••••••••3f9a',
					created: '7 months ago',
					lastUsed: '3 min ago',
				},
				{
					id: '2',
					label: 'CI / CD',
					apiKey: '••••••••••••a17c',
					created: '7 days ago',
					lastUsed: '14 min ago',
				},
				{
					id: '3',
					label: 'Staging',
					apiKey: '••••••••••••4b2e',
					created: '17 hours ago',
					lastUsed: 'Yesterday',
				},
				{
					id: '4',
					label: 'Local dev',
					apiKey: '••••••••••••9d05',
					created: '3 months ago',
					lastUsed: 'Last week',
				},
			];

			// Dynamic slot names contain a dot, so they are bound via `#[expr]`.
			const slotApiKey = 'item.apiKey';
			const slotActions = 'item.actions';

			return { onBack, headers, items, slotApiKey, slotActions };
		},
		template: `
			<N8nSettingsLayout full-width show-back back-label="Back" @back="onBack">
				<N8nSettingsPageHeader
					title="API keys"
					description="Use your API keys to control n8n programmatically."
					docs-url="https://docs.n8n.io/api/"
				/>

				<N8nSettingsSection>
					<N8nDataTableServer :headers="headers" :items="items" :items-length="items.length">
						<template #[slotApiKey]="{ value }">
							<N8nText size="small" color="text-base">{{ value }}</N8nText>
						</template>
						<template #[slotActions]>
							<div style="display: flex; justify-content: flex-end">
								<N8nButton variant="ghost" size="small" icon-only icon="ellipsis-vertical" aria-label="API key actions" />
							</div>
						</template>
					</N8nDataTableServer>
				</N8nSettingsSection>
			</N8nSettingsLayout>
		`,
	}),
};

export const ExampleSettingsPage: Story = {
	render: () => ({
		components,
		setup() {
			// High-impact fields: edits stay in `draft` until the user explicitly saves, at which
			// point they are committed to `saved`. `dirty` (draft ≠ saved) drives the save bar.
			const saved = ref({
				name: 'Acme Production',
				instanceUrl: 'https://acme.app.n8n.cloud',
				timezone: 'Europe/Warsaw',
				senderEmail: 'no-reply@acme.io',
				logLevel: 'info',
			});
			const draft = ref({ ...saved.value });
			const saving = ref(false);
			const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));

			const timezones = [
				'Europe/Warsaw',
				'Europe/London',
				'America/New_York',
				'America/Los_Angeles',
				'Asia/Tokyo',
				'UTC',
			];
			const logLevels = [
				{ value: 'error', label: 'Error' },
				{ value: 'warn', label: 'Warn' },
				{ value: 'info', label: 'Info' },
				{ value: 'debug', label: 'Debug' },
			];

			// Low-impact, instant-save toggle.
			const telemetry = ref(true);

			// Both save modes confirm through the shared app notification (see `confirmSaved`).
			const onSave = () => {
				saving.value = true;
				// Simulate a request; on success commit the draft, hide the bar, and confirm.
				setTimeout(() => {
					saved.value = { ...draft.value };
					saving.value = false;
					confirmSaved('Settings saved');
				}, 1000);
			};
			const onDiscard = () => {
				draft.value = { ...saved.value };
			};
			const onToggleTelemetry = () => {
				// Low-impact: persists immediately and confirms with the same notification.
				confirmSaved('Settings saved');
			};

			return {
				draft,
				saving,
				dirty,
				timezones,
				logLevels,
				telemetry,
				onSave,
				onDiscard,
				onToggleTelemetry,
			};
		},
		// A full-height scrollable viewport hosts the realistic page so the whole settings page is
		// visible and scrolls naturally (rather than being clipped inside a short windowed box). The
		// floating save bar is a sibling of the layout so it can sit 744px wide (12px proud of the
		// 720px content column) and stick to the bottom of the viewport; the layout gets 64px
		// (--spacing--3xl) of bottom scroll padding so the last row can clear the floating bar.
		template: `
			<div style="height: 100vh; overflow-y: auto; background: var(--background--subtle);">
				<N8nSettingsLayout style="padding-block-end: var(--spacing--3xl);">
					<N8nSettingsPageHeader
						title="General"
						description="Instance-wide defaults for naming, scheduling, email, and logging."
						docs-url="https://docs.n8n.io/hosting/configuration/"
					/>

					<N8nSettingsSection title="Instance" description="High-impact fields require an explicit save.">
						<N8nSettingsRowGroup>
							<N8nSettingsRow title="Instance name" description="Shown in the header and in notification emails." :action-fill="true">
								<template #action><N8nInput v-model="draft.name" size="medium" /></template>
							</N8nSettingsRow>
							<N8nSettingsRow title="Instance URL" description="Public base URL used in webhook and email links." :action-fill="true">
								<template #action><N8nInput v-model="draft.instanceUrl" size="medium" /></template>
							</N8nSettingsRow>
							<N8nSettingsRow title="Default timezone" description="Used to schedule and display execution times." :action-fill="true">
								<template #action>
									<N8nSelect v-model="draft.timezone" size="medium">
										<N8nOption v-for="tz in timezones" :key="tz" :value="tz" :label="tz" />
									</N8nSelect>
								</template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>

					<N8nSettingsSection title="Email" description="The SMTP sender used for invites and notifications.">
						<N8nSettingsRowGroup>
							<N8nSettingsRow title="Sender email" description="The address recipients see in the from field." :action-fill="true">
								<template #action><N8nInput v-model="draft.senderEmail" size="medium" /></template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>

					<N8nSettingsSection title="Logging" description="How much detail n8n writes to its logs.">
						<N8nSettingsRowGroup>
							<N8nSettingsRow title="Log level" description="Higher levels are noisier and write more to disk." :action-fill="true">
								<template #action>
									<N8nSelect v-model="draft.logLevel" size="medium">
										<N8nOption v-for="level in logLevels" :key="level.value" :value="level.value" :label="level.label" />
									</N8nSelect>
								</template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>

					<N8nSettingsSection title="Privacy" description="Low-impact toggles save instantly.">
						<N8nSettingsRowGroup>
							<N8nSettingsRow title="Share anonymous telemetry" description="Help us improve n8n. Saved as soon as you toggle it.">
								<template #action>
									<N8nSwitch v-model="telemetry" @update:model-value="onToggleTelemetry" />
								</template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>
				</N8nSettingsLayout>

				<N8nSettingsSaveBar
					floating
					:visible="dirty"
					:saving="saving"
					@save="onSave"
					@discard="onDiscard"
				/>
			</div>
		`,
	}),
	parameters: {
		// Fill the canvas so the page reads as a real, full-height settings page (no windowed box).
		layout: 'fullscreen',
		docs: {
			description: {
				story:
					'A realistic General settings page built from the `N8nSettings*` family inside a full-height scrollable viewport. Editing any high-impact field (instance name/URL, timezone, sender email, log level) flips a dirty flag that slides the floating `N8nSettingsSaveBar` up — a 744px gently rounded bar (the 720px content column plus 12px on each side) with the prominent `--shadow--xl`, resting 24px above the bottom, its Save action on the far right. Discard reverts the draft and hides the bar; Save shows the loading state, commits, hides the bar, and confirms through the existing app notification (the bottom-right `ElNotification` that `useToast()` shows in the app). The low-impact telemetry toggle saves instantly through the same notification. The page carries 64px (`--spacing--3xl`) of bottom scroll padding so the last row clears the floating bar.',
			},
		},
	},
};

// Tool catalog grouped by what each tool can do, derived from the real instance-level MCP scopes.
interface McpTool {
	id: string;
	title: string;
	description: string;
}
interface McpToolGroup {
	id: string;
	title: string;
	/** Leading copy for the type row; the live "x of y allowed" count is appended at render. */
	summary: string;
	icon: string;
	tools: McpTool[];
}

// Shared MCP tool catalog reused by the Instance level MCP page and its Permissions sub-page. Grouped by
// what each tool can do. Lifted to module scope so the main page summary count and the save-gated
// Permissions sub-page draft read from a single source of truth.
const mcpToolGroups: McpToolGroup[] = [
	{
		id: 'read',
		title: 'Read-only',
		summary: 'View workflows, executions, projects, and folders.',
		icon: 'eye',
		tools: [
			{
				id: 'listWorkflows',
				title: 'List workflows',
				description: 'Get a list of your workflows.',
			},
			{
				id: 'getWorkflow',
				title: 'Get workflow details',
				description: 'Get the nodes and settings for a single workflow.',
			},
			{
				id: 'getExecution',
				title: 'Get execution details',
				description: 'Get the data and status for a single execution.',
			},
			{
				id: 'searchProjects',
				title: 'Search projects and folders',
				description: 'Find projects and folders by name.',
			},
		],
	},
	{
		id: 'write',
		title: 'Write',
		summary: 'Create and update workflows and data tables.',
		icon: 'square-pen',
		tools: [
			{
				id: 'upsertWorkflows',
				title: 'Create and update workflows',
				description: 'Create new workflows and update existing ones, acting as you.',
			},
			{
				id: 'upsertDataTables',
				title: 'Create and update data tables',
				description: 'Create new data tables and update existing ones, acting as you.',
			},
		],
	},
	{
		id: 'execute',
		title: 'Execute',
		summary: 'Run workflows.',
		icon: 'play',
		tools: [
			{
				id: 'executeWorkflows',
				title: 'Execute workflows',
				description: 'Run workflows, acting as you.',
			},
		],
	},
];

const mcpToolCount = mcpToolGroups.reduce((total, group) => total + group.tools.length, 0);

// Default per-tool allow-list — 4 of 7 allowed: read-only is mixed (3/4), write is mixed (1/2), and
// execute stays off by default. Shared so the main page summary ("4 of 7 allowed") and the
// Permissions sub-page draft start from the same state.
const defaultMcpAllowed: Record<string, boolean> = {
	listWorkflows: true,
	getWorkflow: true,
	getExecution: true,
	searchProjects: false,
	upsertWorkflows: true,
	upsertDataTables: false,
	executeWorkflows: false,
};

// Sample connected clients reused by the main page preview and the full Connected clients table.
// Each row's brand mark is resolved by `id` through `clientLogoComponents` (Cursor → `CursorLogo`,
// Claude → `ClaudeLogo`, Codex → `CodexLogo`, VS Code → `VsCodeLogo`, ChatGPT → `OpenAiLogo`); the
// `icon` below is only the DS fallback used for any client id that isn't in that map.
//
// Access is PER CLIENT (like PostHog's "Connected applications"): each connection carries its own
// `permissions` — the human-readable titles of the tools it was granted on its authorization screen
// (a subset of the shared `mcpToolGroups` catalog, in catalog order so the details dialog can group
// them back under Read-only / Write / Execute). `connectedBy` is the user who approved the grant.
interface McpClient {
	id: string;
	name: string;
	type: string;
	icon: string;
	connectedBy: string;
	permissions: string[];
	lastActive: string;
	connectedOn: string;
}
const mcpClients: McpClient[] = [
	{
		id: 'cursor',
		name: 'Cursor',
		type: 'IDE',
		icon: 'plug-zap',
		connectedBy: 'jan@n8n.io',
		permissions: [
			'List workflows',
			'Get workflow details',
			'Get execution details',
			'Create and update workflows',
		],
		lastActive: '2 min ago',
		connectedOn: '3 days ago',
	},
	{
		// Every tool granted — the widest grant in the fixture, so the Access text demos the "+N"
		// overflow in both lists.
		id: 'claude',
		name: 'Claude Code',
		type: 'CLI',
		icon: 'anthropic',
		connectedBy: 'mia@n8n.io',
		permissions: [
			'List workflows',
			'Get workflow details',
			'Get execution details',
			'Search projects and folders',
			'Create and update workflows',
			'Create and update data tables',
			'Execute workflows',
		],
		lastActive: '1 hour ago',
		connectedOn: 'Last week',
	},
	{
		id: 'codex',
		name: 'Codex',
		type: 'CLI',
		// Rendered via `CodexLogo` (mapped by id); `icon` is just the unused DS fallback.
		icon: 'sparkles',
		connectedBy: 'sam@n8n.io',
		permissions: [
			'List workflows',
			'Get workflow details',
			'Get execution details',
			'Search projects and folders',
		],
		lastActive: 'Yesterday',
		connectedOn: '2 weeks ago',
	},
	{
		id: 'vscode',
		name: 'VS Code',
		type: 'Editor',
		icon: 'code',
		connectedBy: 'jan@n8n.io',
		permissions: [
			'List workflows',
			'Get workflow details',
			'Create and update workflows',
			'Execute workflows',
		],
		lastActive: '3 days ago',
		connectedOn: 'Last month',
	},
	{
		// Minimal read-only grant — a single permission, so the Access text also demos the no-"+N" case.
		id: 'chatgpt',
		name: 'ChatGPT',
		type: 'Assistant',
		icon: 'mcp',
		connectedBy: 'lena@n8n.io',
		permissions: ['List workflows'],
		lastActive: 'Last week',
		connectedOn: 'Last month',
	},
];

// One-line Access summary for the connected-clients lists: the first two granted permissions as
// plain comma-separated text with a "+N" overflow count (e.g. "List workflows, Run workflows +5").
// Deliberately muted text, NOT badges/chips: the full grant lives in the client details dialog,
// which opens from this text. CSS ellipsis on the rendering side is only the safety net.
const ACCESS_SUMMARY_VISIBLE = 2;
const clientAccessSummary = (client: McpClient) => {
	const visible = client.permissions.slice(0, ACCESS_SUMMARY_VISIBLE).join(', ');
	const overflow = client.permissions.length - ACCESS_SUMMARY_VISIBLE;
	return overflow > 0 ? `${visible} +${overflow}` : visible;
};

// Maps a granted permission title back to its tool group, so the client details dialog can render
// the grant grouped under the same Read-only / Write / Execute structure as the catalog.
const clientPermissionGroups = (client: McpClient) =>
	mcpToolGroups
		.map((group) => ({
			id: group.id,
			title: group.title,
			icon: group.icon,
			permissions: group.tools
				.filter((tool) => client.permissions.includes(tool.title))
				.map((tool) => tool.title),
		}))
		.filter((group) => group.permissions.length > 0);

// The Access text in both connected-clients lists is a real button (it opens the client details
// dialog), styled as muted single-line text — deliberately NOT a badge/chip. The "+N" overflow is
// computed from the permissions array (`clientAccessSummary`); the CSS ellipsis here is only the
// safety net for narrow columns. Hover nudges the colour + underlines to signal clickability.
// Story render templates can't carry scoped CSS, so the rules are injected once into the head
// (guarded by a fixed id), mirroring the StatusDot / mcp-reveal injections.
const MCP_ACCESS_LINK_STYLE_ID = 'mcp-access-link-styles';
if (typeof document !== 'undefined' && !document.getElementById(MCP_ACCESS_LINK_STYLE_ID)) {
	const accessStyle = document.createElement('style');
	accessStyle.id = MCP_ACCESS_LINK_STYLE_ID;
	accessStyle.textContent =
		'.mcp-access-link { display: block; max-width: 100%; padding: 0; border: none; background: none; text-align: start; font-family: inherit; font-size: var(--font-size--2xs); line-height: var(--line-height--lg); color: var(--text-color--subtler); cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-radius: var(--radius--2xs); transition: color 0.1s ease-in-out; }' +
		'.mcp-access-link:hover { color: var(--text-color--subtle); text-decoration: underline; }' +
		'.mcp-access-link:focus-visible { outline: var(--focus--border-width, 2px) solid var(--focus--border-color); outline-offset: var(--spacing--5xs); }' +
		'@media (prefers-reduced-motion: reduce) { .mcp-access-link { transition: none; } }';
	document.head.appendChild(accessStyle);
}

// Full connection details for ONE connected client, opened by clicking the Access text in either
// connected-clients list (the overview preview rows and the sub-page table share this component).
// Composed from the dialog primitives (instead of the `header` string prop) so the header carries
// the client's brand mark next to its name. The body is a label/value grid — Connected by /
// Connected on / Last active — followed by Access: the FULL grant as a clean vertical list of plain
// permission rows grouped under the catalog's Read-only / Write / Execute headings (no chips). The
// footer's destructive "Revoke access" emits `revoke` so the host page removes the client (same as
// the lists' hover-revealed revoke) and closes. Styles are injected once (fixed id), as above.
const MCP_CLIENT_DETAILS_STYLE_ID = 'mcp-client-details-styles';
const ClientDetailsDialog = defineComponent({
	name: 'ClientDetailsDialog',
	components: {
		N8nDialog,
		N8nDialogHeader,
		N8nDialogTitle,
		N8nDialogDescription,
		N8nDialogFooter,
		N8nDialogClose,
		N8nButton,
		N8nIcon,
		N8nText,
	},
	props: {
		open: { type: Boolean, default: false },
		client: { type: Object as PropType<McpClient | null>, default: null },
	},
	emits: ['update:open', 'revoke'],
	setup(props, { emit }) {
		if (typeof document !== 'undefined' && !document.getElementById(MCP_CLIENT_DETAILS_STYLE_ID)) {
			const style = document.createElement('style');
			style.id = MCP_CLIENT_DETAILS_STYLE_ID;
			style.textContent =
				'.mcp-client-details__identity { display: flex; align-items: center; gap: var(--spacing--2xs); }' +
				// Bordered logo card mirroring the settings-row `visual` slot, so the client mark reads
				// the same here as in the lists.
				'.mcp-client-details__logo { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: var(--spacing--xl); height: var(--spacing--xl); border: var(--border-width, 1px) solid var(--border-color--subtle); border-radius: var(--radius--2xs); color: var(--text-color--subtle); }' +
				'.mcp-client-details__fields { display: grid; grid-template-columns: max-content 1fr; align-items: start; column-gap: var(--spacing--xl); row-gap: var(--spacing--xs); margin-block-start: var(--spacing--md); }' +
				'.mcp-client-details__access { display: flex; flex-direction: column; gap: var(--spacing--xs); min-width: 0; }' +
				'.mcp-client-details__group { display: flex; flex-direction: column; gap: var(--spacing--5xs); }' +
				// Same uppercase mini-heading treatment as the Connect picker's category headers.
				'.mcp-client-details__group-title { font-size: var(--font-size--3xs); font-weight: var(--font-weight--bold); letter-spacing: var(--letter-spacing--wider); text-transform: uppercase; color: var(--text-color--subtle); }';
			document.head.appendChild(style);
		}

		const logo = computed(() => (props.client ? clientLogoComponents[props.client.id] : undefined));
		const groups = computed(() => (props.client ? clientPermissionGroups(props.client) : []));
		const onOpenChange = (value: boolean) => emit('update:open', value);
		const onRevoke = () => {
			if (props.client) emit('revoke', props.client);
		};
		return { logo, groups, onOpenChange, onRevoke };
	},
	// `client` stays set while the dialog animates closed, so the content never blanks mid-exit.
	template: `
		<N8nDialog :open="open" size="medium" @update:open="onOpenChange">
			<template v-if="client">
				<N8nDialogHeader>
					<div class="mcp-client-details__identity">
						<span class="mcp-client-details__logo">
							<component :is="logo" v-if="logo" style="font-size: var(--font-size--md);" />
							<N8nIcon v-else :icon="client.icon" />
						</span>
						<N8nDialogTitle>{{ client.name }}</N8nDialogTitle>
					</div>
					<N8nDialogDescription>{{ client.type }} · connected to this instance over MCP</N8nDialogDescription>
				</N8nDialogHeader>

				<div class="mcp-client-details__fields">
					<N8nText size="small" color="text-light">Connected by</N8nText>
					<N8nText size="small" color="text-dark">{{ client.connectedBy }}</N8nText>
					<N8nText size="small" color="text-light">Connected on</N8nText>
					<N8nText size="small" color="text-dark">{{ client.connectedOn }}</N8nText>
					<N8nText size="small" color="text-light">Last active</N8nText>
					<N8nText size="small" color="text-dark">{{ client.lastActive }}</N8nText>
					<N8nText size="small" color="text-light">Access</N8nText>
					<div class="mcp-client-details__access">
						<div v-for="group in groups" :key="group.id" class="mcp-client-details__group">
							<span class="mcp-client-details__group-title">{{ group.title }}</span>
							<N8nText v-for="permission in group.permissions" :key="permission" size="small" color="text-dark" tag="div">{{ permission }}</N8nText>
						</div>
					</div>
				</div>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="outline" label="Close" />
					</N8nDialogClose>
					<N8nButton variant="destructive" label="Revoke access" @click="onRevoke" />
				</N8nDialogFooter>
			</template>
		</N8nDialog>
	`,
});

// Sample workflow catalogue the MCP server can reach, grouped by project. Reused by the main page
// ("12 across 4 projects" summary) and the Workflows available sub-page, where each workflow can be
// individually exposed to or hidden from connected clients. Names mirror realistic instance content.
interface McpWorkflow {
	id: string;
	name: string;
	/** Trigger + one-line purpose, shown as the row description. */
	description: string;
	/** Whether the workflow itself is active in n8n (independent of MCP exposure). */
	active: boolean;
	/**
	 * Whether the workflow is currently exposed to connected MCP clients. A partial mix keeps the
	 * Workflows available sub-page's per-project counts interesting (e.g. "2 of 3 exposed"); the
	 * sub-page seeds its editable state from these values.
	 */
	exposed: boolean;
}
interface McpWorkflowProject {
	id: string;
	name: string;
	workflows: McpWorkflow[];
}
const mcpWorkflowProjects: McpWorkflowProject[] = [
	{
		id: 'personal',
		name: 'Personal',
		workflows: [
			{
				id: 'daily-weather',
				name: 'Daily Weather Email',
				description: 'Scheduled · emails a morning forecast',
				active: true,
				exposed: true,
			},
			{
				id: 'release-digest',
				name: 'Release KB Weekly Digest',
				description: "Scheduled · summarizes the week's releases",
				active: true,
				exposed: true,
			},
			{
				id: 'finance-tracker',
				name: 'Personal Finance Tracker',
				description: 'Webhook · logs expenses to a sheet',
				active: false,
				exposed: false,
			},
		],
	},
	{
		id: 'developer-platform',
		name: 'Developer Platform',
		workflows: [
			{
				id: 'triage-ci',
				name: 'Tool: Triage CI Failure',
				description: 'Triggered by CI · classifies pipeline failures',
				active: true,
				exposed: true,
			},
			{
				id: 'docs-sync',
				name: 'Docs Changelog Sync',
				description: 'Scheduled · publishes changelog entries',
				active: true,
				exposed: false,
			},
			{
				id: 'pr-reminder',
				name: 'PR Review Reminder',
				description: 'Scheduled · nudges reviewers on stale PRs',
				active: false,
				exposed: false,
			},
		],
	},
	{
		id: 'solutions-engineering',
		name: 'Solutions Engineering',
		workflows: [
			{
				id: 'legal-review',
				name: 'BG Germany — Legal AI Contract Review',
				description: 'On demand · reviews contracts with AI',
				active: true,
				exposed: true,
			},
			{
				id: 'lead-enrichment',
				name: 'Lead Enrichment Pipeline',
				description: 'Webhook · enriches inbound leads',
				active: true,
				exposed: true,
			},
			{
				id: 'demo-provisioner',
				name: 'Demo Env Provisioner',
				description: 'On demand · spins up demo environments',
				active: false,
				exposed: false,
			},
		],
	},
	{
		id: 'security-hub',
		name: 'Security Hub',
		workflows: [
			{
				id: 'audit-export',
				name: 'Audit Log Export',
				description: 'Scheduled · ships audit logs to the SIEM',
				active: true,
				exposed: true,
			},
			{
				id: 'access-review',
				name: 'Access Review Bot',
				description: 'Scheduled · flags stale access grants',
				active: true,
				exposed: false,
			},
			{
				id: 'secret-rotation',
				name: 'Secret Rotation',
				description: 'Scheduled · rotates API credentials',
				active: true,
				exposed: false,
			},
		],
	},
];

const mcpWorkflowCount = mcpWorkflowProjects.reduce(
	(total, project) => total + project.workflows.length,
	0,
);

// ---------------------------------------------------------------------------
// Connection details — the client-led setup catalogue, lifted to module scope so the Connect
// dialog (ModelContextProtocol) and the standalone authorization screen (McpAuthorize) read one
// shared model: the same server URL for every client, a masked token, and a per-client descriptor
// whose `category` drives the setup UI. CLI clients carry install/auth commands + an alternative
// config file; IDEs carry a deep link + a manual config file; web clients carry a one-click
// connector URL.
// ---------------------------------------------------------------------------
const mcpServerUrl = 'https://acme.app.n8n.cloud/mcp/9f3a2b';
const mcpAuthToken = 'n8n_mcp_••••••••••••3f9a';
const mcpDocsUrl = 'https://docs.n8n.io/manage-cloud/mcp-access/';

// Config snippets, computed once from the server URL. Most clients take the common `mcpServers`
// JSON shape; Codex reads TOML, VS Code uses its `servers` map, Gemini an `httpUrl`, Windsurf a
// `serverUrl` — so each client points at the snippet it needs.
const mcpJsonSnippet = `{\n  "mcpServers": {\n    "n8n": {\n      "url": "${mcpServerUrl}"\n    }\n  }\n}`;
const mcpClaudeSnippet = `{\n  "mcpServers": {\n    "n8n": {\n      "type": "http",\n      "url": "${mcpServerUrl}"\n    }\n  }\n}`;
const mcpCodexSnippet = `[mcp_servers.n8n]\nurl = "${mcpServerUrl}"`;
const mcpGeminiSnippet = `{\n  "mcpServers": {\n    "n8n": {\n      "httpUrl": "${mcpServerUrl}"\n    }\n  }\n}`;
const mcpVscodeSnippet = `{\n  "servers": {\n    "n8n": {\n      "type": "http",\n      "url": "${mcpServerUrl}"\n    }\n  }\n}`;
const mcpWindsurfSnippet = `{\n  "mcpServers": {\n    "n8n": {\n      "serverUrl": "${mcpServerUrl}"\n    }\n  }\n}`;

// One-click deep links, computed from the server URL exactly as each editor expects:
//   • Cursor: base64 of `{"url":"<serverUrl>"}` passed in a `config` query param.
//   • VS Code: a URL-encoded `{"name","type":"http","url"}` JSON object.
const mcpCursorDeepLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=n8n&config=${btoa(
	`{"url":"${mcpServerUrl}"}`,
)}`;
const mcpVscodeDeepLink = `vscode:mcp/install?${encodeURIComponent(
	`{"name":"n8n","type":"http","url":"${mcpServerUrl}"}`,
)}`;

type McpClientCategory = 'cli' | 'web' | 'ide';
interface McpClientSetup {
	id: string;
	name: string;
	category: McpClientCategory;
	/** Brand-mark key into `clientLogoComponents`; the DS `icon` is shown when absent. */
	logo?: string;
	icon: IconName;
	docsUrl: string;
	installCommand?: string;
	authCommand?: string;
	configFilename?: string;
	configSnippet?: string;
	deepLink?: string;
	addUrl?: string;
}
const mcpClientCatalog: Record<string, McpClientSetup> = {
	claude: {
		id: 'claude',
		name: 'Claude Code',
		category: 'cli',
		logo: 'claude',
		icon: 'anthropic',
		docsUrl: mcpDocsUrl,
		installCommand: `claude mcp add --transport http n8n ${mcpServerUrl}`,
		configFilename: '~/.claude.json',
		configSnippet: mcpClaudeSnippet,
	},
	codex: {
		id: 'codex',
		name: 'Codex',
		category: 'cli',
		logo: 'codex',
		icon: 'sparkles',
		docsUrl: mcpDocsUrl,
		installCommand: `codex mcp add n8n --url "${mcpServerUrl}"`,
		configFilename: '~/.codex/config.toml',
		configSnippet: mcpCodexSnippet,
		authCommand: 'codex mcp login n8n',
	},
	gemini: {
		id: 'gemini',
		name: 'Gemini CLI',
		category: 'cli',
		logo: 'gemini',
		icon: 'terminal',
		docsUrl: mcpDocsUrl,
		installCommand: `gemini mcp add --transport http n8n ${mcpServerUrl}`,
		configFilename: '~/.gemini/settings.json',
		configSnippet: mcpGeminiSnippet,
	},
	'claude-ai': {
		id: 'claude-ai',
		name: 'Claude.ai',
		category: 'web',
		logo: 'claude',
		icon: 'anthropic',
		docsUrl: mcpDocsUrl,
		addUrl: 'https://claude.ai/settings/connectors',
	},
	chatgpt: {
		id: 'chatgpt',
		name: 'ChatGPT',
		category: 'web',
		logo: 'chatgpt',
		icon: 'bot',
		docsUrl: mcpDocsUrl,
		addUrl: 'https://chatgpt.com/#settings/connectors',
	},
	cursor: {
		id: 'cursor',
		name: 'Cursor',
		category: 'ide',
		logo: 'cursor',
		icon: 'plug-zap',
		docsUrl: mcpDocsUrl,
		deepLink: mcpCursorDeepLink,
		configFilename: '.cursor/mcp.json',
		configSnippet: mcpJsonSnippet,
	},
	vscode: {
		id: 'vscode',
		name: 'VS Code',
		category: 'ide',
		logo: 'vscode',
		icon: 'code',
		docsUrl: mcpDocsUrl,
		deepLink: mcpVscodeDeepLink,
		configFilename: '.vscode/mcp.json',
		configSnippet: mcpVscodeSnippet,
	},
	windsurf: {
		id: 'windsurf',
		name: 'Windsurf',
		category: 'ide',
		icon: 'box',
		docsUrl: mcpDocsUrl,
		configFilename: '~/.codeium/windsurf/mcp_config.json',
		configSnippet: mcpWindsurfSnippet,
	},
};

// The three client categories, in the order they appear in the picker.
const mcpClientCategories: Array<{ id: McpClientCategory; label: string; clientIds: string[] }> = [
	{ id: 'cli', label: 'CLI', clientIds: ['claude', 'codex', 'gemini'] },
	{ id: 'web', label: 'Web Clients', clientIds: ['claude-ai', 'chatgpt'] },
	{ id: 'ide', label: 'IDE', clientIds: ['cursor', 'vscode', 'windsurf'] },
];

export const ModelContextProtocol: Story = {
	render: () => ({
		components: { ...components, ClientDetailsDialog },
		setup() {
			// Enabling/disabling the instance MCP server is high-stakes — it exposes the instance and
			// can disconnect connected clients — so this is an explicit status + button, NOT a toggle.
			// Enabling is lower-risk and applies instantly; disabling is gated behind a confirmation
			// `N8nDialog`. The connection area reads its on/off state at a glance via the status dot.
			const enabled = ref(true);
			const showDisableDialog = ref(false);
			// The client-led connect flow lives in a dialog opened from the "Your client" row's Connect
			// button: the grouped picker + tailored setup steps, nothing else — no footer, no in-dialog
			// consent. CLOSING the dialog mocks what happens in reality: the configured client initiates
			// the OAuth flow against the instance, so the n8n authorization (consent) screen opens in a
			// NEW TAB — the sibling McpAuthorize story, rendered standalone via the preview iframe URL
			// (`/iframe.html?id=…&viewMode=story`), with the picked client riding along as a plain
			// `client` query param. The story id is derived from this file's meta title so a rename
			// can't silently break the handoff. Each preview iframe owns its module state, so the grant
			// can't sync back across the tab boundary here (unlike the prototype, whose store bridges
			// tabs with a BroadcastChannel) — the consent tab shows its own success state instead.
			const showConnectDialog = ref(false);
			const onOpenConnect = () => {
				showConnectDialog.value = true;
			};
			const authorizeStoryId = `${meta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}--mcp-authorize`;
			const onConnectDialogOpenChange = (open: boolean) => {
				showConnectDialog.value = open;
				if (open || !activeClientDef.value) return;
				window.open(
					`${window.location.pathname}?id=${authorizeStoryId}&viewMode=story&client=${encodeURIComponent(activeClient.value)}`,
					'_blank',
				);
			};
			// Per-story reactive copy of the shared fixture so revoking mutates only this story (the
			// module `mcpClients` stays an untouched seed). The count summaries, the preview, the
			// count-gated "View all" row and the empty state all derive from this one source of truth.
			const clients = ref<McpClient[]>(mcpClients.map((client) => ({ ...client })));
			const clientCount = computed(() => clients.value.length);
			// Plural-aware disable confirmation body ("1 connected client" vs "N connected clients").
			const disableDialogDescription = computed(
				() =>
					`This disconnects ${clientCount.value} ${clientCount.value === 1 ? 'connected client' : 'connected clients'} and revokes their access. You can turn it back on later.`,
			);

			// Confirmations (instant enable, confirmed disable, and the copy affordances in the inlined
			// Connection details section) all go through the shared app notification.
			const confirm = confirmSaved;
			// Enabling is instant (low-stakes), then a follow-up dialog offers to expose every workflow
			// on the instance right away. Enabling flips on immediately + confirms; the dialog is the
			// optional next step (not a gate).
			const showExposeAllDialog = ref(false);
			const onEnable = () => {
				enabled.value = true;
				confirm('MCP access enabled');
				showExposeAllDialog.value = true;
			};
			// "Expose all workflows" from the follow-up dialog. In the app/prototype this flips every
			// workflow's exposure (and the auto-expose-new flag) in the shared store so the Workflows
			// available page reflects it; here the main page and that page are separate story instances,
			// so this just closes + confirms to keep the UX demonstrable.
			const onExposeAll = () => {
				showExposeAllDialog.value = false;
				confirm('All workflows exposed to MCP');
			};
			const onConfirmDisable = () => {
				enabled.value = false;
				showDisableDialog.value = false;
				confirm('MCP access disabled');
			};
			// While enabled, the status control is a dropdown whose single danger item re-opens the
			// destructive disable confirmation (disabling is gated; it never toggles off instantly).
			const disableMenuItems: Array<{
				id: string;
				label: string;
				icon: { type: 'icon'; value: IconName };
			}> = [{ id: 'disable', label: 'Disable', icon: { type: 'icon', value: 'power' } }];
			const onDisableMenuSelect = () => {
				showDisableDialog.value = true;
			};

			// Connection details — folded onto the main page and rebuilt as a Supabase-style,
			// client-led flow, reading the shared module-scope catalogue (mcpServerUrl /
			// mcpClientCatalog / mcpClientCategories) that the McpAuthorize story also uses.
			//
			// Selected client drives the entire connect-dialog body. The dialog defaults to Claude Code
			// (the most common pick), so it opens with the CLI Install/Configure/Authenticate steps
			// already visible; the placeholder logic stays intact for when the value is cleared.
			const activeClient = ref('claude');
			const activeClientDef = computed(() => mcpClientCatalog[activeClient.value]);
			const activeClientLogo = computed(() => {
				const logo = activeClientDef.value?.logo;
				return logo ? clientLogoComponents[logo] : undefined;
			});

			// The grouped, searchable client picker is built with N8nDropdownMenu (N8nSelect has no
			// brand-mark option slot). N8nDropdownMenu has no native section header, so each category
			// is a disabled, `divided` header item (skipped by keyboard nav + non-selectable) followed
			// by its clients; the active client carries `checked`. The menu only emits `search`, so the
			// term is filtered here and empty categories drop out.
			const clientSearch = ref('');
			const clientMenuItems = computed(() => {
				const term = clientSearch.value.trim().toLowerCase();
				const items: Array<{
					id: string;
					label: string;
					disabled?: boolean;
					divided?: boolean;
					checked?: boolean;
					icon?: { type: 'icon'; value: IconName };
					data: { kind: 'header' | 'client'; logo?: string };
				}> = [];
				for (const category of mcpClientCategories) {
					const matching = category.clientIds.filter((id) =>
						mcpClientCatalog[id].name.toLowerCase().includes(term),
					);
					if (matching.length === 0) continue;
					items.push({
						id: `header:${category.id}`,
						label: category.label,
						disabled: true,
						divided: items.length > 0,
						data: { kind: 'header' },
					});
					for (const id of matching) {
						const client = mcpClientCatalog[id];
						items.push({
							id,
							label: client.name,
							checked: id === activeClient.value,
							icon: { type: 'icon', value: client.icon },
							data: { kind: 'client', logo: client.logo },
						});
					}
				}
				return items;
			});

			// Copy affordance. The contextual `message` follows n8n's existing "MCP URL copied" pattern
			// ("Server URL copied", "Token copied", "Config copied", "Command copied") instead of a
			// generic "Copied to clipboard".
			const onCopy = (text: string, message = 'Copied') => {
				void navigator.clipboard?.writeText(text);
				confirm(message);
			};
			// Selecting a client switches the setup body (header items are disabled, so guard anyway).
			const onSelectClient = (id: string) => {
				if (typeof id !== 'string' || id.startsWith('header:')) return;
				activeClient.value = id;
			};
			const onClientSearch = (term: string) => {
				clientSearch.value = term ?? '';
			};

			// Per-client setup-row copy, computed in setup() because the story template is a JS
			// template literal (no nested backticks). Descriptions follow the vetted UX copy and have no
			// trailing period, matching the existing settings tone.
			const installDescription = computed(
				() => `Run this command to install ${activeClientDef.value?.name ?? ''}`,
			);
			const authDescription = computed(() =>
				activeClientDef.value?.authCommand
					? 'Run this command, then log in to authorize n8n'
					: `Run '/mcp' in ${activeClientDef.value?.name ?? ''} and select n8n to connect`,
			);
			const webDescription = computed(
				() => `Add n8n to ${activeClientDef.value?.name ?? ''} in one click, then approve access`,
			);
			const ideDescription = computed(
				() => `Open ${activeClientDef.value?.name ?? ''} and add the n8n server automatically`,
			);
			const serverUrlDescription = computed(
				() =>
					`Paste this into your config to point ${activeClientDef.value?.name ?? ''} at your instance`,
			);
			const addButtonLabel = computed(() => `Add to ${activeClientDef.value?.name ?? ''}`);

			// Tool access summary ("4 of 7 allowed"), read from the shared default allow-list. Tool
			// access itself lives on a dedicated, save-gated Permissions sub-page (McpPermissions).
			const allowedCount = Object.values(defaultMcpAllowed).filter(Boolean).length;
			const allowedSummary = `${allowedCount} of ${mcpToolCount} allowed`;

			// Workflows available summary ("12 across 4 projects"), read from the shared catalogue. The
			// per-project exposure lives on its own McpWorkflowsAvailable sub-page.
			const workflowsSummary = `${mcpWorkflowCount} across ${mcpWorkflowProjects.length} projects`;

			// Connected clients preview + "View all". The Access rows and the "View all" row genuinely
			// navigate to their sibling stories. Storybook's addon-links isn't installed here, so this
			// is done by URL: embedded in the manager the preview runs in an iframe (`window.top` is
			// the manager → use `?path=/story/...`); in the standalone preview iframe (`?id=...`) the
			// document is top-level → use `?id=...&viewMode=story`.
			const previewClients = computed(() => clients.value.slice(0, 3));
			// Only surface the "All connected clients / View all" row when there are MORE clients than
			// the inline preview already shows — otherwise it's redundant.
			const showViewAll = computed(() => clients.value.length > previewClients.value.length);
			const openStory = (storyId: string) => {
				try {
					const top = window.top;
					if (top && top !== window.self) {
						top.location.href = `${top.location.pathname}?path=/story/${storyId}`;
						return;
					}
				} catch {
					// Reading window.top across origins can throw; fall back to iframe-local navigation.
				}
				window.location.search = `?id=${storyId}&viewMode=story`;
			};
			const onOpenPermissions = () => openStory('instance-settings-examples--mcp-permissions');
			const onOpenWorkflows = () =>
				openStory('instance-settings-examples--mcp-workflows-available');
			const onViewAllClients = () => openStory('instance-settings-examples--mcp-connected-clients');
			const onRevokeClient = (client: McpClient) => {
				clients.value = clients.value.filter((c) => c.id !== client.id);
				confirm(`${client.name} disconnected`);
			};

			// Client details dialog: opened by clicking a preview row's Access text; shows the full
			// per-client grant (grouped) and offers the same destructive revoke as the row's
			// hover-revealed button. `detailsClient` stays set through the close animation.
			const detailsClient = ref<McpClient | null>(null);
			const showDetailsDialog = ref(false);
			const onOpenClientDetails = (client: McpClient) => {
				detailsClient.value = client;
				showDetailsDialog.value = true;
			};
			const onRevokeFromDetails = (client: McpClient) => {
				showDetailsDialog.value = false;
				onRevokeClient(client);
			};
			const accessSummary = clientAccessSummary;

			return {
				enabled,
				showDisableDialog,
				showConnectDialog,
				onConnectDialogOpenChange,
				detailsClient,
				showDetailsDialog,
				onOpenClientDetails,
				onRevokeFromDetails,
				accessSummary,
				onOpenConnect,
				showExposeAllDialog,
				onExposeAll,
				clientCount,
				disableDialogDescription,
				onEnable,
				onConfirmDisable,
				disableMenuItems,
				onDisableMenuSelect,
				clientLogos: clientLogoComponents,
				serverUrl: mcpServerUrl,
				authToken: mcpAuthToken,
				docsUrl: mcpDocsUrl,
				activeClient,
				activeClientDef,
				activeClientLogo,
				clientMenuItems,
				onCopy,
				onSelectClient,
				onClientSearch,
				installDescription,
				authDescription,
				webDescription,
				ideDescription,
				serverUrlDescription,
				addButtonLabel,
				allowedSummary,
				workflowsSummary,
				previewClients,
				showViewAll,
				onOpenPermissions,
				onOpenWorkflows,
				onViewAllClients,
				onRevokeClient,
			};
		},
		// Full-height scrollable viewport so the page reads as a real, long settings page. There is no
		// floating save bar here: enabling is instant, the client-led Connection details edits are
		// instant (one-click connect + copy affordances), and tool/workflow edits move to their
		// save-gated sub-pages, so the only persisted state changes are confirmed via the app
		// notification or a dialog.
		// While the server is DISABLED the page collapses to a single dashed-border empty state (a
		// call to action to enable); enabling instantly reveals the full Connection details / Access /
		// Connected clients page, with a gentle entrance animation on the swap.
		template: `
			<div style="height: 100vh; overflow-y: auto; background: var(--background--subtle);">
				<N8nSettingsLayout>
					<N8nSettingsPageHeader
						title="Instance level MCP"
						description="Let AI assistants and IDEs connect to this instance over the Model Context Protocol (MCP), then control which tools and workflows they can use."
						docs-url="https://docs.n8n.io/manage-cloud/mcp-access/"
					/>

					<!-- Only shown when MCP is ENABLED. While disabled the whole top section (status row +
					     "Your client" row) is hidden and the dashed empty-state card below stands in as the
					     sole enable affordance, so no empty section/group wrapper is left behind. -->
					<N8nSettingsSection v-if="enabled">
						<N8nSettingsRowGroup>
							<N8nSettingsRow>
								<template #info>
									<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs); min-width: 0;">
										<N8nText bold size="medium" color="text-dark">MCP status</N8nText>
										<N8nText size="small" color="text-light">Connect AI assistants and IDEs like Claude, Cursor, and ChatGPT to this instance over MCP.</N8nText>
									</div>
								</template>
								<template #action>
									<N8nDropdownMenu v-if="enabled" :items="disableMenuItems" placement="bottom-end" @select="onDisableMenuSelect">
										<template #trigger>
											<N8nButton variant="outline" size="medium" aria-label="Manage MCP access">
												<span style="display: inline-flex; align-items: center; gap: var(--spacing--3xs);">
													<StatusDot color="var(--color--success)" pulse />
													Enabled
													<N8nIcon icon="chevron-down" size="small" />
												</span>
											</N8nButton>
										</template>
										<template #item-leading="{ item }">
											<N8nIcon :icon="item.icon.value" size="small" :style="{ color: 'var(--color--danger)' }" />
										</template>
										<template #item-label="{ item }">
											<span :style="{ color: 'var(--color--danger)' }">{{ item.label }}</span>
										</template>
									</N8nDropdownMenu>
									<N8nButton v-else variant="outline" size="medium" aria-label="Enable MCP access" @click="onEnable">
										<span style="display: inline-flex; align-items: center; gap: var(--spacing--3xs);">
											<StatusDot color="var(--color--danger)" />
											Enable
										</span>
									</N8nButton>
								</template>
							</N8nSettingsRow>

							<!-- ENABLED → the client picker moves into a dialog. This row sits directly beneath
							     MCP status in the SAME group and just carries a prominent "Connect" button; the
							     grouped client picker + tailored setup steps live in the Connect dialog below. -->
							<N8nSettingsRow
								v-if="enabled"
								class="mcp-reveal"
								title="Your client"
								description="Connect an AI assistant or IDE, then follow the tailored setup steps."
							>
								<template #action>
									<N8nButton variant="outline" size="medium" label="Connect" @click="onOpenConnect" />
								</template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>

					<!-- DISABLED → a single dashed-border empty state stands in for the whole page below the
					     status row. The animated logo-card cluster (static mcp mark flanked by cycling
					     client marks) previews the clients that could connect. The primary button calls the
					     same instant-enable handler as the status row; the ghost "Learn more" button to its
					     left opens the same docs URL as the page header in a new tab. -->
					<div
						v-if="!enabled"
						class="mcp-reveal"
						style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--spacing--sm); margin-block-start: var(--spacing--xl); padding: var(--spacing--2xl) var(--spacing--xl); border: var(--border-width, 1px) dashed var(--border-color); border-radius: var(--radius--lg); background: var(--background--surface);"
					>
						<ClientLogoCards icon="mcp" />
						<div style="display: flex; flex-direction: column; gap: var(--spacing--3xs); max-width: 32rem;">
							<N8nText bold size="large" color="text-dark">Connect AI assistants to build and run workflows</N8nText>
							<N8nText size="small" color="text-light">Let MCP clients like Claude Code and Cursor build, run, and iterate on workflows in your instance.</N8nText>
						</div>
						<div style="display: flex; align-items: center; justify-content: center; gap: var(--spacing--2xs);">
							<N8nButton variant="ghost" size="medium" :href="docsUrl" target="_blank">
								Learn more
								<N8nIcon icon="arrow-up-right" size="small" />
							</N8nButton>
							<N8nButton variant="solid" size="medium" label="Enable MCP access" @click="onEnable" />
						</div>
					</div>

					<N8nSettingsSection v-if="enabled" class="mcp-reveal" title="Access" description="What connected clients can do, and which workflows they can reach.">
						<N8nSettingsRowGroup>
							<N8nSettingsRow title="Permissions" description="Allow or block read-only, write, and execute tools." clickable @click="onOpenPermissions">
								<template #action><N8nSettingsRowConfigure :value="allowedSummary" /></template>
							</N8nSettingsRow>
							<N8nSettingsRow title="Workflows available" description="Choose which workflows connected clients can read and run." clickable @click="onOpenWorkflows">
								<template #action><N8nSettingsRowConfigure :value="workflowsSummary" /></template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>

					<N8nSettingsSection v-if="enabled" class="mcp-reveal" title="Connected clients" description="Assistants and IDEs currently connected to this instance.">
						<!-- With clients connected: the inline preview, plus the "View all" row ONLY when the
						     total exceeds what the preview already shows. -->
						<template v-if="clientCount > 0">
							<N8nSettingsRowGroup>
								<!-- The info column is built via the #info slot (mirroring the row's own
								     title/description rendering) so a third, muted Access line fits below:
								     the client's granted permissions as plain truncated text ("a, b +N", no
								     chips) that opens the client details dialog on click. -->
								<N8nSettingsRow
									v-for="client in previewClients"
									:key="client.id"
									show-visual
									hoverable
									reveal-actions-on-hover
								>
									<template #visual>
										<component :is="clientLogos[client.id]" v-if="clientLogos[client.id]" style="font-size: var(--font-size--md);" />
										<N8nIcon v-else :icon="client.icon" />
									</template>
									<template #info>
										<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs); min-width: 0;">
											<N8nText bold size="medium" color="text-dark" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ client.name }}</N8nText>
											<N8nText size="small" color="text-light" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ client.type }} · connected by {{ client.connectedBy }} · active {{ client.lastActive }}</N8nText>
											<button
												type="button"
												class="mcp-access-link"
												:aria-label="'View connection details for ' + client.name"
												@click="onOpenClientDetails(client)"
											>{{ accessSummary(client) }}</button>
										</div>
									</template>
									<template #action><N8nButton variant="outline" size="medium" label="Revoke access" @click="onRevokeClient(client)" /></template>
								</N8nSettingsRow>
							</N8nSettingsRowGroup>
							<N8nSettingsRowGroup v-if="showViewAll">
								<N8nSettingsRow title="All connected clients" :description="clientCount + ' clients have access'" clickable @click="onViewAllClients">
									<template #action><N8nSettingsRowConfigure value="View all" /></template>
								</N8nSettingsRow>
							</N8nSettingsRowGroup>
						</template>

						<!-- No clients: a compact, section-scoped empty state (same dashed-card + animated
						     logo-cards language as the disabled-MCP state, with the plug-zap mark in the
						     centre) that points back at the Connection details picker above. -->
						<div
							v-else
							style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--spacing--2xs); padding: var(--spacing--xl); border: var(--border-width, 1px) dashed var(--border-color); border-radius: var(--radius--lg); background: var(--background--surface);"
						>
							<ClientLogoCards icon="plug-zap" style="margin-block-end: var(--spacing--4xs);" />
							<N8nText bold size="medium" color="text-dark">No clients connected yet</N8nText>
							<N8nText size="small" color="text-light">Use Connect above to set up your first client.</N8nText>
						</div>
					</N8nSettingsSection>
				</N8nSettingsLayout>

				<N8nDialog
					v-model:open="showDisableDialog"
					size="small"
					header="Disable MCP access?"
					:description="disableDialogDescription"
				>
					<N8nDialogFooter>
						<N8nDialogClose as-child>
							<N8nButton variant="outline" label="Cancel" />
						</N8nDialogClose>
						<N8nButton variant="destructive" label="Disable MCP access" @click="onConfirmDisable" />
					</N8nDialogFooter>
				</N8nDialog>

				<!-- EXPOSE-ALL follow-up → opened right after enabling MCP (enabling is already instant).
				     Offers to expose every workflow on the instance to connected clients at once, with the
				     reassurance that individual workflows can be hidden or access revoked later. "Not now"
				     just closes; MCP stays enabled and exposure is unchanged. -->
				<N8nDialog
					v-model:open="showExposeAllDialog"
					size="small"
					header="Expose all workflows to MCP?"
					description="This lets connected clients reach every workflow on this instance right away. You can hide any workflow or revoke access at any time."
				>
					<N8nDialogFooter>
						<N8nDialogClose as-child>
							<N8nButton variant="outline" label="Not now" />
						</N8nDialogClose>
						<N8nButton variant="solid" label="Expose all workflows" @click="onExposeAll" />
					</N8nDialogFooter>
				</N8nDialog>

				<!-- CONNECT DIALOG → the client-led flow: the grouped client picker on top, the tailored
				     per-category instructions below, wrapped in AutoHeight so switching between a short
				     web client and a tall CLI/IDE animates the resize. Deliberately NO footer and NO
				     in-dialog consent: like the real flow, granting access is the CLIENT's move — closing
				     this dialog mocks the client initiating OAuth, opening n8n's authorization screen
				     (the McpAuthorize story) in a new tab (see onConnectDialogOpenChange). The large
				     preset keeps it comfortably wide for snippets. -->
				<N8nDialog
					:open="showConnectDialog"
					size="large"
					header="Connect a client"
					description="Pick the client you want to connect, then follow the tailored setup steps. When your client connects, n8n asks you to grant it access in a new tab."
					@update:open="onConnectDialogOpenChange"
				>
					<!-- Same structure the connect flow had on the page — ONE bordered N8nSettingsRowGroup
					     with the "Your client" picker row on top (divider shown once a client is selected)
					     and the tailored, dividerless setup rows below, wrapped in AutoHeight so switching
					     clients animates the dialog resize. Uses the official settings-row components so
					     the info column and action align exactly as on the page. -->
					<div class="mcp-connect-dialog" style="margin-block-start: var(--spacing--xs);">
						<N8nSettingsRowGroup>
							<N8nSettingsRow
								title="Your client"
								description="Choose your client to see tailored setup steps"
								:show-divider="!!activeClientDef"
							>
								<template #action>
									<N8nDropdownMenu
										searchable
										search-placeholder="Search clients…"
										empty-text="No clients found"
										:items="clientMenuItems"
										placement="bottom-end"
										@select="onSelectClient"
										@search="onClientSearch"
									>
										<template #trigger>
											<N8nButton variant="outline" size="medium" aria-label="Select client">
												<span style="display: inline-flex; align-items: center; gap: var(--spacing--2xs);">
													<template v-if="activeClientDef">
														<component :is="activeClientLogo" v-if="activeClientLogo" style="font-size: var(--font-size--md);" />
														<N8nIcon v-else :icon="activeClientDef.icon" size="small" color="text-light" />
														{{ activeClientDef.name }}
													</template>
													<N8nText v-else size="medium" color="text-light">Choose your client…</N8nText>
													<N8nIcon icon="chevron-down" size="small" />
												</span>
											</N8nButton>
										</template>
										<template #item-leading="{ item }">
											<component
												:is="clientLogos[item.data.logo]"
												v-if="item.data.kind === 'client' && item.data.logo && clientLogos[item.data.logo]"
												style="font-size: var(--font-size--md);"
											/>
											<N8nIcon
												v-else-if="item.data.kind === 'client'"
												:icon="item.icon.value"
												size="large"
												color="text-light"
											/>
										</template>
										<template #item-label="{ item }">
											<span
												v-if="item.data.kind === 'header'"
												style="display: block; padding-block: var(--spacing--5xs); font-size: var(--font-size--3xs); font-weight: var(--font-weight--bold); letter-spacing: var(--letter-spacing--wider); text-transform: uppercase; color: var(--text-color--subtle);"
											>{{ item.label }}</span>
											<N8nText v-else size="medium" color="text-dark">{{ item.label }}</N8nText>
										</template>
									</N8nDropdownMenu>
								</template>
							</N8nSettingsRow>

							<!-- Tailored setup steps (nothing until a client is picked). Dividerless rows read as one
							     connected block; AutoHeight animates the height when the selection switches. -->
							<AutoHeight>
								<!-- CLI: Install → Configure → Authenticate. -->
								<template v-if="activeClientDef?.category === 'cli'">
									<N8nSettingsRow layout="vertical" :show-divider="false" title="Install" :description="installDescription">
										<template #action>
											<CopyInput :value="activeClientDef.installCommand" aria-label="Copy command" @copy="(text) => onCopy(text, 'Command copied')" />
										</template>
									</N8nSettingsRow>
									<N8nSettingsRow layout="vertical" :show-divider="false" title="Configure" description="Add this to your config file to connect to n8n">
										<template #action>
											<CopyInput multiline :value="activeClientDef.configSnippet" aria-label="Copy config" @copy="(text) => onCopy(text, 'Config copied')" />
										</template>
									</N8nSettingsRow>
									<N8nSettingsRow layout="vertical" :show-divider="false" title="Authenticate" :description="authDescription">
										<template #action>
											<CopyInput :value="activeClientDef.authCommand || '/mcp'" aria-label="Copy command" @copy="(text) => onCopy(text, 'Command copied')" />
										</template>
									</N8nSettingsRow>
								</template>

								<!-- Web client: a single one-click row with a branded "Add to …" button. -->
								<template v-else-if="activeClientDef?.category === 'web'">
									<N8nSettingsRow :show-divider="false" title="One-click setup" :description="webDescription">
										<template #action>
											<BrandButton :label="addButtonLabel" :href="activeClientDef.addUrl">
												<template #leading>
													<component :is="activeClientLogo" v-if="activeClientLogo" />
													<N8nIcon v-else :icon="activeClientDef.icon" size="large" />
												</template>
											</BrandButton>
										</template>
									</N8nSettingsRow>
								</template>

								<!-- IDE: one-click deep-link row, then manual-config rows (Server URL, token, config). -->
								<template v-else-if="activeClientDef">
									<N8nSettingsRow :show-divider="false" title="One-click setup" :description="ideDescription">
										<template #action>
											<BrandButton :label="addButtonLabel" :href="activeClientDef.deepLink">
												<template #leading>
													<component :is="activeClientLogo" v-if="activeClientLogo" />
													<N8nIcon v-else :icon="activeClientDef.icon" size="large" />
												</template>
											</BrandButton>
										</template>
									</N8nSettingsRow>
									<N8nSettingsRow layout="vertical" :show-divider="false" title="Server URL" :description="serverUrlDescription">
										<template #action>
											<CopyInput :value="serverUrl" aria-label="Copy server URL" @copy="(text) => onCopy(text, 'Server URL copied')" />
										</template>
									</N8nSettingsRow>
									<N8nSettingsRow layout="vertical" :show-divider="false" title="Authentication token" description="Authorizes the connection, so treat it like a password">
										<template #action>
											<CopyInput :value="authToken" aria-label="Copy authentication token" @copy="(text) => onCopy(text, 'Token copied')" />
										</template>
									</N8nSettingsRow>
									<N8nSettingsRow layout="vertical" :show-divider="false" title="Configure" description="Add this to your config file to connect to n8n">
										<template #action>
											<CopyInput multiline :value="activeClientDef.configSnippet" aria-label="Copy config" @copy="(text) => onCopy(text, 'Config copied')" />
										</template>
									</N8nSettingsRow>
								</template>
							</AutoHeight>
						</N8nSettingsRowGroup>
					</div>
				</N8nDialog>

				<!-- CLIENT DETAILS → opened from a preview row's Access text: the full per-client grant
				     grouped by tool type, plus the destructive revoke (same behaviour as the row button). -->
				<ClientDetailsDialog
					v-model:open="showDetailsDialog"
					:client="detailsClient"
					@revoke="onRevokeFromDetails"
				/>
			</div>
		`,
	}),
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				story:
					'The main **Instance level MCP** page, re-expressed from the current instance-level MCP screen into the native settings system. **Connection** drops the old "Preview" badge and replaces the master toggle with a single **MCP status** status-action control: when disabled it is an outline button showing a solid **red dot + "Enable"** that turns MCP on **instantly** (low-risk); when enabled it becomes an outline **"Enabled"** trigger — a **green, gently pulsing dot** + a `chevron-down` — that opens an `N8nDropdownMenu` whose single, danger-styled **"Disable"** item opens an **`N8nDialog` confirmation** ("…will disconnect N connected clients and revoke their access"). Enabling stays instant while disabling stays gated, because a toggle would imply an instant, low-stakes change for something that exposes the instance. **When disabled**, everything below the status row collapses to a single **dashed-border empty state** (an **animated fanned trio of logo cards** — the static `mcp` mark in the raised centre card, flanked by two tilted cards cycling through the client brand marks with a staggered 300ms fade+blur swap every 3s, mimicking the External Secrets empty state from n8n PR #24685 and static under `prefers-reduced-motion` — above "Connect AI assistants to build and run workflows", the subtext "Let MCP clients like Claude Code and Cursor build, run, and iterate on workflows in your instance", and a centered button row — a ghost **"Learn more"** docs button with a trailing `arrow-up-right` icon (opens the docs in a new tab) to the left of the primary **"Enable MCP access"** button wired to the same instant-enable handler); enabling reveals the full page with a gentle entrance animation (honouring `prefers-reduced-motion`). The **"No clients connected yet"** empty state reuses the same animated cluster with the `plug-zap` mark in the centre. **Connection details** is **client-led**: the first row is a **"Your client"** picker — a searchable `N8nDropdownMenu` grouped into three uppercase categories (**AI Agent CLI**, **Web Clients**, **IDE**) via disabled header items + `divided` separators, each client showing its real brand mark in the `#item-leading` slot (Cursor near-black `#26251e`, Claude Code coral `#D97757`, Codex purple→blue, VS Code blue-ribbon, ChatGPT/Claude.ai marks; DS-icon fallbacks for Gemini CLI / Windsurf). The selected client drives a **dividerless group of official `N8nSettingsRow`s** (matching the Figma installation section — each row carries its own title/description, and a `CopyInput` — a readonly monospace `N8nInput` paired with an icon-only copy `N8nButton` in its `#append` slot — renders the command/snippet/value inside the row\'s `#action`): **CLIs** (Claude Code, Codex, Gemini CLI) get **Install** → **Configure** → **Authenticate** rows, where Authenticate is a copyable command (Codex `codex mcp login`; Claude Code / Gemini the in-app `/mcp` command); **Web clients** (Claude.ai, ChatGPT) get a single **One-click setup** row whose action is a branded **"Add to …"** button; **IDEs** (Cursor, VS Code) get a **One-click setup** deep-link button row followed by **Server URL**, **Authentication token**, and **Configure** rows. Copies confirm via the existing app notification with contextual messages ("Server URL copied", "Token copied", "Config copied", "Command copied"). The dialog is deliberately **footerless** — client selection + setup steps only, no Cancel/Continue and no in-dialog consent — because granting access is the **client\'s** move, not the dialog\'s: **closing it** (X / overlay) mocks the configured client initiating the OAuth flow, opening the standalone **McpAuthorize** story (n8n\'s authorization screen — connection visual, grouped consent checkboxes, Allow/Deny) in a **new tab** via the preview iframe URL (`/iframe.html?id=…&viewMode=story&client=<id>`, the story id derived from this file\'s meta title, the picked client riding along as a query param). Each preview iframe owns its module state, so the grant intentionally ends at the consent tab\'s success state — unlike the prototype, whose store syncs it back over a `BroadcastChannel`. **Access** routes to the save-gated **Permissions** sub-page (`N8nSettingsRowConfigure` "4 of 7 allowed") and the **Workflows available** sub-page ("12 across 4 projects"); these rows and the **Connected clients** "View all" row genuinely navigate to their sibling stories (by URL, since Storybook\'s addon-links is not installed). **Connected clients** previews a few rows inline — each carrying a third, muted **Access** line: the client\'s granted permissions as **plain truncated text** ("List workflows, Get workflow details +5", the first two plus a "+N" overflow computed from the array — never chips) that opens the **client details dialog** (brand mark + name header, Connected by / Connected on / Last active fields, the full grant as a vertical list grouped by Read-only / Write / Execute, and a destructive **Revoke access** footer that removes the client like the row\'s hover-revealed button) — with that "View all" row into the full table sub-page.',
			},
		},
	},
};

// Styles for the standalone authorization screen (McpAuthorize): a full-viewport neutral backdrop
// with one centered card — deliberately NOT the settings layout, so the page reads as n8n's OAuth
// authorization screen rather than a settings sub-page. The connection visual is the requesting
// client's mark and the n8n mark as two bordered logo tiles (the same card treatment as the
// settings lists) joined by a dashed SVG connector — the not-yet-established connection the page
// decides. Story render templates can't carry scoped CSS, so the rules are injected once into the
// head (guarded by a fixed id), mirroring the other MCP style injections.
const MCP_AUTHORIZE_STYLE_ID = 'mcp-authorize-styles';
if (typeof document !== 'undefined' && !document.getElementById(MCP_AUTHORIZE_STYLE_ID)) {
	const authorizeStyle = document.createElement('style');
	authorizeStyle.id = MCP_AUTHORIZE_STYLE_ID;
	authorizeStyle.textContent =
		// Pinned to exactly the viewport height (NOT min-height: an unconstrained box just grows
		// instead of engaging its own overflow-y) so the page is the scroll container and tall
		// consent content scrolls to the actions regardless of what wraps the story iframe.
		'.mcp-authorize { height: 100vh; display: flex; justify-content: center; align-items: flex-start; padding: var(--spacing--xl) var(--spacing--sm); overflow-y: auto; background: var(--background--subtle); }' +
		'.mcp-authorize__card { display: flex; flex-direction: column; gap: var(--spacing--md); width: 100%; max-width: 36rem; margin-block-start: clamp(var(--spacing--sm), 10vh, var(--spacing--4xl)); padding: var(--spacing--xl); border: var(--border-width, 1px) solid var(--border-color--subtle); border-radius: var(--radius--lg); background: var(--background--surface); box-shadow: var(--shadow--sm); }' +
		'.mcp-authorize__connection { display: flex; align-items: center; justify-content: center; gap: var(--spacing--2xs); }' +
		'.mcp-authorize__tile { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: calc(var(--spacing--md) * 2); height: calc(var(--spacing--md) * 2); border: var(--border-width, 1px) solid var(--border-color--subtle); border-radius: var(--radius--xs); background: var(--background--surface); box-shadow: var(--shadow--xs); font-size: var(--font-size--xl); color: var(--text-color--subtle); }' +
		'.mcp-authorize__connector { position: relative; display: inline-flex; align-items: center; justify-content: center; width: var(--spacing--3xl); height: var(--spacing--2xs); color: var(--border-color--strong); }' +
		'.mcp-authorize__connector svg { display: block; width: 100%; height: 100%; overflow: visible; }' +
		// While connecting, the dashed line marches toward the n8n tile to read as active; connected holds still.
		'.mcp-authorize__connection.is-connecting .mcp-authorize__connector-line { color: var(--color--primary); animation: mcp-authorize-dash 0.8s linear infinite; }' +
		'@keyframes mcp-authorize-dash { to { stroke-dashoffset: -14; } }' +
		// Status badge centered over the connector: spinner while connecting, green check popping in when connected.
		'.mcp-authorize__badge { position: absolute; top: 50%; left: 50%; display: inline-flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); width: var(--spacing--lg); height: var(--spacing--lg); border-radius: var(--radius--circle, 50%); background: var(--background--surface); color: var(--text-color--subtle); line-height: 0; }' +
		'.mcp-authorize__connection.is-connected .mcp-authorize__badge { color: var(--color--success); animation: mcp-authorize-pop 0.24s ease-out both; }' +
		'@keyframes mcp-authorize-pop { from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }' +
		'.mcp-authorize__copy { display: flex; flex-direction: column; gap: var(--spacing--5xs); text-align: center; animation: mcp-authorize-fade 0.3s ease-out both; }' +
		'@keyframes mcp-authorize-fade { from { opacity: 0; transform: translateY(var(--spacing--3xs)); } to { opacity: 1; transform: translateY(0); } }' +
		'@media (prefers-reduced-motion: reduce) { .mcp-authorize__connection.is-connecting .mcp-authorize__connector-line, .mcp-authorize__connection.is-connected .mcp-authorize__badge, .mcp-authorize__copy { animation: none; } }' +
		'.mcp-authorize__footnote { text-align: center; }' +
		'.mcp-authorize__actions { display: flex; align-items: center; justify-content: flex-end; gap: var(--spacing--2xs); }' +
		'.mcp-authorize__outcome { display: flex; flex-direction: column; align-items: center; gap: var(--spacing--3xs); padding: var(--spacing--md) 0 var(--spacing--xl); text-align: center; }';
	document.head.appendChild(authorizeStyle);
}

export const McpAuthorize: Story = {
	render: () => ({
		components,
		setup() {
			// The standalone n8n authorization screen a client's OAuth flow lands on, opened in a NEW
			// TAB when the ModelContextProtocol story's Connect dialog closes. The requesting client
			// arrives as a plain `client` query param on the preview iframe URL (the simplest reliable
			// channel into a standalone story — no args wiring, no storage); unknown or absent ids
			// fall back to Claude Code so the story stays demonstrable when opened directly.
			const params = new URLSearchParams(window.location.search);
			const clientDef = mcpClientCatalog[params.get('client') ?? ''] ?? mcpClientCatalog.claude;
			const clientLogo = clientDef.logo ? clientLogoComponents[clientDef.logo] : undefined;

			// The consent draft mirrors the shared tool catalog with the safe default: read-only
			// pre-checked, write/execute opt-in. Group checkboxes stage a whole group at once
			// (indeterminate when mixed) — the same semantics as the Permissions page.
			const consentGroups = mcpToolGroups;
			const consentDraft = ref<Record<string, boolean>>(
				Object.fromEntries(
					mcpToolGroups.flatMap((group) =>
						group.tools.map((tool) => [tool.id, group.id === 'read']),
					),
				),
			);
			const consentGroupCount = (group: McpToolGroup) =>
				group.tools.filter((tool) => consentDraft.value[tool.id]).length;
			const isConsentGroupAllOn = (group: McpToolGroup) =>
				consentGroupCount(group) === group.tools.length;
			const isConsentGroupMixed = (group: McpToolGroup) => {
				const count = consentGroupCount(group);
				return count > 0 && count < group.tools.length;
			};
			const onConsentGroupToggle = (group: McpToolGroup) => {
				const turnOn = !isConsentGroupAllOn(group);
				group.tools.forEach((tool) => {
					consentDraft.value[tool.id] = turnOn;
				});
			};
			const grantedCount = computed(() => Object.values(consentDraft.value).filter(Boolean).length);

			// End states, like a real OAuth callback page: the page's job is done — tell the user the
			// outcome and send them back to the tab they came from. Each Storybook preview iframe owns
			// its own module state, so (unlike the prototype, whose store syncs grants across tabs via
			// a BroadcastChannel) allowing here can't add the client to the launching story's list —
			// the success state IS the outcome.
			const outcome = ref<'pending' | 'granted' | 'denied'>('pending');
			const onAllowAccess = () => {
				if (grantedCount.value === 0) return;
				outcome.value = 'granted';
			};
			const onDeny = () => {
				outcome.value = 'denied';
			};

			// Artificial "connecting" phase: the page opens establishing the link (animated dashed
			// connector + spinner between the two logo tiles), then settles into "connected" (a green
			// check appears and the consent content is revealed). Purely presentational — a beat that
			// makes the OAuth handoff read as a real connection. Reduced-motion skips straight to connected.
			const phase = ref<'connecting' | 'connected'>('connecting');
			let connectTimer: ReturnType<typeof setTimeout> | undefined;
			onMounted(() => {
				const prefersReducedMotion = window.matchMedia?.(
					'(prefers-reduced-motion: reduce)',
				).matches;
				if (prefersReducedMotion) {
					phase.value = 'connected';
					return;
				}
				connectTimer = setTimeout(() => {
					phase.value = 'connected';
				}, 1800);
			});
			onBeforeUnmount(() => clearTimeout(connectTimer));

			return {
				clientDef,
				clientLogo,
				consentGroups,
				consentDraft,
				isConsentGroupAllOn,
				isConsentGroupMixed,
				onConsentGroupToggle,
				grantedCount,
				outcome,
				onAllowAccess,
				onDeny,
				phase,
			};
		},
		template: `
			<div class="mcp-authorize">
				<main class="mcp-authorize__card">
					<!-- Connection visual: [client mark] ┈┈┈ [n8n mark]. -->
					<div class="mcp-authorize__connection" :class="'is-' + phase" aria-hidden="true">
						<span class="mcp-authorize__tile">
							<component :is="clientLogo" v-if="clientLogo" />
							<N8nIcon v-else :icon="clientDef.icon" />
						</span>
						<span class="mcp-authorize__connector">
							<svg viewBox="0 0 64 8" preserveAspectRatio="none">
								<line class="mcp-authorize__connector-line" x1="0" y1="4" x2="64" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 5" />
							</svg>
							<span class="mcp-authorize__badge">
								<N8nSpinner v-if="phase === 'connecting'" size="small" />
								<N8nIcon v-else icon="circle-check" color="success" size="large" />
							</span>
						</span>
						<span class="mcp-authorize__tile">
							<N8nLogoMark />
						</span>
					</div>

					<template v-if="outcome === 'pending' && phase === 'connected'">
						<div class="mcp-authorize__copy">
							<N8nText bold size="large" color="text-dark">{{ clientDef.name }} wants access to your n8n instance</N8nText>
							<N8nText size="small" color="text-light">Choose what it's allowed to do. You can change this anytime.</N8nText>
						</div>

						<N8nSettingsRowGroup>
							<template v-for="(group, groupIndex) in consentGroups" :key="group.id">
								<N8nSettingsRow show-visual :title="group.title" :description="group.summary" :show-divider="false">
									<template #visual><N8nIcon :icon="group.icon" /></template>
									<template #action>
										<N8nCheckbox
											:model-value="isConsentGroupAllOn(group)"
											:indeterminate="isConsentGroupMixed(group)"
											:aria-label="'Allow all ' + group.title + ' tools'"
											@change="onConsentGroupToggle(group)"
										/>
									</template>
								</N8nSettingsRow>
								<N8nSettingsRow
									v-for="(tool, toolIndex) in group.tools"
									:key="tool.id"
									:title="tool.title"
									:description="tool.description"
									:show-divider="toolIndex === group.tools.length - 1 && groupIndex < consentGroups.length - 1"
								>
									<template #action>
										<N8nCheckbox v-model="consentDraft[tool.id]" :aria-label="'Allow ' + tool.title" />
									</template>
								</N8nSettingsRow>
							</template>
						</N8nSettingsRowGroup>

						<N8nText size="xsmall" color="text-light" class="mcp-authorize__footnote">Applies only to this connection — other clients keep their own permissions.</N8nText>

						<div class="mcp-authorize__actions">
							<N8nButton variant="outline" size="large" label="Deny" @click="onDeny" />
							<N8nButton variant="solid" size="large" label="Allow access" :disabled="grantedCount === 0" @click="onAllowAccess" />
						</div>
					</template>

					<!-- Terminal states, like a real OAuth callback page. -->
					<div v-else-if="outcome === 'granted'" class="mcp-authorize__outcome">
						<N8nText bold size="large" color="text-dark">Access granted</N8nText>
						<N8nText size="small" color="text-light">{{ clientDef.name }} is now connected to your instance. You can close this tab and return to n8n.</N8nText>
					</div>
					<div v-else-if="outcome === 'denied'" class="mcp-authorize__outcome">
						<N8nIcon icon="circle-x" color="text-light" size="xlarge" />
						<N8nText bold size="large" color="text-dark">Access denied</N8nText>
						<N8nText size="small" color="text-light">{{ clientDef.name }} wasn't connected. You can close this tab.</N8nText>
					</div>
				</main>
			</div>
		`,
	}),
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				story:
					'The standalone **n8n authorization screen** a client\'s OAuth flow lands on — opened in a **new tab** when the Instance level MCP story\'s Connect dialog closes (mocking the client initiating the flow), and evaluable on its own here. It deliberately drops all settings chrome (no sidebar, no settings layout): a full-viewport neutral backdrop with one centered card, like a real OAuth consent page. The header is a **connection visual** — the requesting client\'s brand mark and the **n8n logomark** (inlined from the design system\'s `N8nLogo` asset, brand raspberry `#EA4B71`) as two small bordered logo tiles joined by a **dashed SVG connector**: the not-yet-established connection this page decides. On load it runs a brief **loading → connected** sequence (~1.8s): while *connecting*, the dashed line marches (animated `stroke-dashoffset`) and an `N8nSpinner` sits centered over it while the consent content stays hidden; once *connected*, a green **`circle-check`** (`--color--success`) pops in over the connector and the consent content fades in. It\'s purely presentational (a `phase` ref driven by `setTimeout`), and honors `prefers-reduced-motion` by skipping straight to the connected state with no animation. The requesting client arrives as a plain **`client` query param** on the preview iframe URL (`/iframe.html?id=…&client=cursor`) — the simplest reliable channel into a standalone story — falling back to Claude Code when absent. Below, the consent content: "**<client> wants access to your n8n instance**", the shared tool catalog as a grouped checkbox list (group checkboxes indeterminate when mixed; **read-only pre-checked, write/execute opt-in**), the per-connection reassurance, and centered **Deny** / **Allow access** actions (Allow disabled until at least one tool is checked). Both end in a terminal, OAuth-callback-style state: **"Access granted — you can close this tab and return to n8n"** (`circle-check`) or **"Access denied — <client> wasn\'t connected"** (`circle-x`). Storybook preview iframes each own their module state, so unlike the prototype (whose store syncs the grant to the launching tab over a `BroadcastChannel`) the grant intentionally ends at the success state here.',
			},
		},
	},
};

export const McpPermissions: Story = {
	render: () => ({
		components,
		setup() {
			const onBack = () => alert('Back to Instance level MCP');

			const groups = mcpToolGroups;

			// High-impact + save-gated: per-tool permissions stay in `draft` until the user saves, at
			// which point they commit to `saved`. `dirty` (draft ≠ saved) drives the floating save bar,
			// exactly like the Example Settings Page.
			const saved = ref<Record<string, boolean>>({ ...defaultMcpAllowed });
			const draft = ref<Record<string, boolean>>({ ...defaultMcpAllowed });
			const saving = ref(false);
			const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));

			// All groups start expanded so every checkbox is visible at a glance.
			const expanded = ref<Record<string, boolean>>({ read: true, write: true, execute: true });

			const groupAllowedCount = (group: McpToolGroup) =>
				group.tools.filter((tool) => draft.value[tool.id]).length;
			const isGroupAllOn = (group: McpToolGroup) => groupAllowedCount(group) === group.tools.length;
			// The group checkbox shows an indeterminate dash when only some tools in it are allowed.
			const isGroupMixed = (group: McpToolGroup) => {
				const count = groupAllowedCount(group);
				return count > 0 && count < group.tools.length;
			};
			// Every group's description reads as a plain live "x of y allowed" count.
			const groupSummary = (group: McpToolGroup) =>
				`${groupAllowedCount(group)} of ${group.tools.length} allowed`;

			// Permissions use the standard design-system N8nCheckbox (reka-ui), which renders its own
			// checked / unchecked / indeterminate states, keyboard handling, and focus ring. Per-tool
			// checkboxes are `v-model`-bound straight to the draft; the group checkbox is controlled
			// from the derived group state, so its `change` simply stages every tool at once:
			// if the group isn't already fully on, turn all on, otherwise turn all off.
			const onGroupToggle = (group: McpToolGroup) => {
				const turnOn = !isGroupAllOn(group);
				group.tools.forEach((tool) => {
					draft.value[tool.id] = turnOn;
				});
			};

			// Save / discard mirroring the Example Settings Page dirty-state flow; the successful save
			// confirms through the shared app notification.
			const onSave = () => {
				saving.value = true;
				setTimeout(() => {
					saved.value = { ...draft.value };
					saving.value = false;
					confirmSaved('Permissions saved');
				}, 1000);
			};
			const onDiscard = () => {
				draft.value = { ...saved.value };
			};

			return {
				onBack,
				groups,
				draft,
				saving,
				dirty,
				expanded,
				isGroupAllOn,
				isGroupMixed,
				groupSummary,
				onGroupToggle,
				onSave,
				onDiscard,
			};
		},
		// Same full-height scrollable viewport + floating save bar wrapper as the Example Settings
		// Page: permission changes are high-impact, so every checkbox edit lands behind an explicit Save.
		template: `
			<div style="height: 100vh; overflow-y: auto; background: var(--background--subtle);">
				<N8nSettingsLayout show-back back-label="Back to Instance level MCP" @back="onBack" style="padding-block-end: var(--spacing--3xl);">
					<N8nSettingsPageHeader
						title="Permissions"
						description="Choose which tools connected clients can use, grouped by what each tool does. Changes apply to every connected client and take effect when you save."
						docs-url="https://docs.n8n.io/manage-cloud/mcp-access/"
					/>

					<N8nSettingsSection title="Tool access">
						<N8nSettingsRowGroup>
							<N8nSettingsRow
								v-for="group in groups"
								:key="group.id"
								v-model="expanded[group.id]"
								expandable
								:disclosure="false"
								show-visual
								:title="group.title"
								:description="groupSummary(group)"
							>
								<template #visual><N8nIcon :icon="group.icon" /></template>
								<template #action>
									<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
										<N8nButton
											variant="ghost"
											size="small"
											:aria-expanded="expanded[group.id]"
											:aria-label="(expanded[group.id] ? 'Collapse ' : 'Expand ') + group.title"
											@click="expanded[group.id] = !expanded[group.id]"
										>
											{{ expanded[group.id] ? 'Show less' : 'Show more' }}
											<N8nIcon
												icon="chevron-down"
												size="small"
												:style="{ transition: 'transform 0.2s ease-in-out', transform: expanded[group.id] ? 'rotate(180deg)' : 'none' }"
											/>
										</N8nButton>
										<N8nCheckbox
											:model-value="isGroupAllOn(group)"
											:indeterminate="isGroupMixed(group)"
											:aria-label="'Allow all ' + group.title + ' tools'"
											@change="onGroupToggle(group)"
										/>
									</div>
								</template>
								<template #expanded>
									<N8nSettingsRow
										v-for="(tool, index) in group.tools"
										:key="tool.id"
										:title="tool.title"
										:description="tool.description"
										:show-divider="index < group.tools.length - 1"
									>
										<template #action>
											<N8nCheckbox
												v-model="draft[tool.id]"
												:aria-label="'Allow ' + tool.title"
											/>
										</template>
									</N8nSettingsRow>
								</template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>
				</N8nSettingsLayout>

				<N8nSettingsSaveBar
					floating
					:visible="dirty"
					:saving="saving"
					save-label="Save permissions"
					@save="onSave"
					@discard="onDiscard"
				/>
			</div>
		`,
	}),
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				story:
					'The save-gated **Permissions** sub-page reached from the Instance level MCP page\'s Access section. Tools are grouped by type — Read-only (`eye`), Write (`square-pen`), Execute (`play`) — in `expandable` `N8nSettingsRow`s. Because this page commits behind an explicit Save, the controls are **checkboxes, not switches** — the standard design-system **`N8nCheckbox`** (reka-ui). Each group header builds its own `#action` (with `:disclosure="false"`) so the order reads **disclosure first, checkbox last**: a custom **"View more ⌄ / Show less ⌄"** toggle drives the row\'s expand `v-model`, and the group checkbox sits to its right (checked / unchecked / **indeterminate** when its tools are mixed; its `change` stages every tool in the group at once). Per-tool checkboxes are `v-model`-bound to the draft, and every group (Read-only / Write / Execute) is a normal editable permission group. Edits stage in a draft; changing any checkbox flips dirty and slides up the floating `N8nSettingsSaveBar`, which Saves (confirming through the existing app notification) or Discards.',
			},
		},
	},
};

export const McpConnectedClients: Story = {
	render: () => ({
		components: { ...components, ClientDetailsDialog },
		setup() {
			const onBack = () => alert('Back to Instance level MCP');

			// Mirrors the API keys table: the trailing `actions` column has no underlying data so it
			// uses a value accessor. The `client` and `access` columns are rendered through item slots;
			// Access gets a fixed width so its plain-text permission summary truncates (ellipsis)
			// instead of stretching the fixed-layout table.
			const headers = [
				{ title: 'Client', key: 'client', disableSort: true },
				{ title: 'Connected by', key: 'connectedBy' },
				{ title: 'Access', key: 'access', value: () => '', disableSort: true, width: 260 },
				{ title: 'Last active', key: 'lastActive' },
				{ title: 'Connected on', key: 'connectedOn' },
				{ title: '', key: 'actions', value: () => '', disableSort: true, align: 'end', width: 140 },
			];

			// Per-story reactive copy so revoking actually removes the row (and can empty the table),
			// leaving the shared `mcpClients` fixture untouched.
			const items = ref<McpClient[]>(mcpClients.map((client) => ({ ...client })));

			// Dynamic slot names contain a dot, so they are bound via `#[expr]`.
			const slotClient = 'item.client';
			const slotAccess = 'item.access';
			const slotActions = 'item.actions';

			// The trailing "Revoke access" button is hidden at rest and revealed on the table ROW's
			// hover OR keyboard focus-within (so Tab-focusing it shows it). It stays in the DOM (opacity
			// only, never display:none/v-if) so it keeps its place in the tab order; pointer-events are
			// disabled while hidden so it isn't clickable when invisible. Injected once into the head
			// (guarded by a fixed id), namespaced under the unique `.mcp-connected-clients__revoke`
			// wrapper class so the row-scoped reveal can't leak to other tables.
			const REVOKE_STYLE_ID = 'mcp-connected-clients-revoke-styles';
			if (typeof document !== 'undefined' && !document.getElementById(REVOKE_STYLE_ID)) {
				const revokeStyle = document.createElement('style');
				revokeStyle.id = REVOKE_STYLE_ID;
				revokeStyle.textContent =
					'.mcp-connected-clients__revoke { display: flex; justify-content: flex-end; opacity: 0; pointer-events: none; transition: opacity 0.12s ease-in-out; }' +
					'tr:hover .mcp-connected-clients__revoke, tr:focus-within .mcp-connected-clients__revoke { opacity: 1; pointer-events: auto; }' +
					'@media (prefers-reduced-motion: reduce) { .mcp-connected-clients__revoke { transition: none; } }';
				document.head.appendChild(revokeStyle);
			}

			// Confirmation on revoke goes through the shared app notification, matching the main
			// page's "<client> disconnected".
			const onRevoke = (client: McpClient) => {
				items.value = items.value.filter((c) => c.id !== client.id);
				confirmSaved(`${client.name} disconnected`);
			};

			// Client details dialog, opened by clicking a row's Access text: the full per-client grant
			// (grouped) plus the destructive revoke — same removal as the row's hover-revealed button.
			const detailsClient = ref<McpClient | null>(null);
			const showDetailsDialog = ref(false);
			const onOpenClientDetails = (client: McpClient) => {
				detailsClient.value = client;
				showDetailsDialog.value = true;
			};
			const onRevokeFromDetails = (client: McpClient) => {
				showDetailsDialog.value = false;
				onRevoke(client);
			};
			const accessSummary = clientAccessSummary;

			return {
				onBack,
				headers,
				items,
				slotClient,
				slotAccess,
				slotActions,
				onRevoke,
				detailsClient,
				showDetailsDialog,
				onOpenClientDetails,
				onRevokeFromDetails,
				accessSummary,
				clientLogos: clientLogoComponents,
			};
		},
		template: `
			<N8nSettingsLayout full-width show-back back-label="Back to Instance level MCP" @back="onBack">
				<N8nSettingsPageHeader
					title="Connected clients"
					description="Assistants and IDEs connected to this instance over MCP, what they can access, and when they were last active."
					docs-url="https://docs.n8n.io/manage-cloud/mcp-access/"
				/>

				<N8nSettingsSection>
					<N8nDataTableServer v-if="items.length" :headers="headers" :items="items" :items-length="items.length">
						<template #[slotClient]="{ item }">
							<div style="display: flex; align-items: center; gap: var(--spacing--2xs); min-width: 0;">
								<span style="display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: var(--spacing--lg); height: var(--spacing--lg); border: var(--border-width, 1px) solid var(--border-color--subtle); border-radius: var(--radius--2xs); color: var(--text-color--subtle);">
									<component :is="clientLogos[item.id]" v-if="clientLogos[item.id]" style="font-size: var(--font-size--2xs);" />
									<N8nIcon v-else :icon="item.icon" size="small" />
								</span>
								<span style="display: flex; flex-direction: column; min-width: 0;">
									<N8nText size="small" color="text-dark" bold>{{ item.name }}</N8nText>
									<N8nText size="xsmall" color="text-light">{{ item.type }}</N8nText>
								</span>
							</div>
						</template>
						<!-- Access: the granted permissions as muted plain text ("a, b +N", no chips),
						     truncating with ellipsis in the fixed-width column; clicking opens the client
						     details dialog with the full grant. -->
						<template #[slotAccess]="{ item }">
							<button
								type="button"
								class="mcp-access-link"
								:aria-label="'View connection details for ' + item.name"
								@click="onOpenClientDetails(item)"
							>{{ accessSummary(item) }}</button>
						</template>
						<template #[slotActions]="{ item }">
							<div class="mcp-connected-clients__revoke">
								<N8nButton variant="outline" size="small" label="Revoke access" :aria-label="'Revoke access for ' + item.name" @click="onRevoke(item)" />
							</div>
						</template>
					</N8nDataTableServer>

					<!-- Empty state when every client has been revoked (matches the main page's message and
					     its animated logo-cards treatment). -->
					<div
						v-else
						style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--spacing--2xs); padding: var(--spacing--2xl) var(--spacing--xl); border: var(--border-width, 1px) dashed var(--border-color); border-radius: var(--radius--lg); background: var(--background--surface);"
					>
						<ClientLogoCards icon="plug-zap" style="margin-block-end: var(--spacing--4xs);" />
						<N8nText bold size="medium" color="text-dark">No clients connected yet</N8nText>
						<N8nText size="small" color="text-light">Connect a client from the Instance level MCP page to see it here.</N8nText>
					</div>
				</N8nSettingsSection>

				<!-- CLIENT DETAILS → opened from a row's Access text: the full per-client grant grouped
				     by tool type, plus the destructive revoke (same behaviour as the row button). -->
				<ClientDetailsDialog
					v-model:open="showDetailsDialog"
					:client="detailsClient"
					@revoke="onRevokeFromDetails"
				/>
			</N8nSettingsLayout>
		`,
	}),
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				story:
					'The full **Connected clients** table sub-page, modelled on the API keys story: a `full-width` `N8nSettingsLayout` with an `N8nDataTableServer` beneath a header that stays centered in the 720px column. Columns cover the Client (name + IDE/type with a leading brand mark resolved through an id→component map — Cursor in near-black, Claude Code in coral, Codex its purple→blue blossom, VS Code its blue-ribbon mark, and ChatGPT the black OpenAI blossom, with a neutral DS icon as the fallback for anything unmapped), who Connected it (the user\'s email), the per-client **Access** — the connection\'s granted permissions as muted **plain truncated text** ("List workflows, Get workflow details +5": the first two plus a "+N" overflow computed from the array, ellipsis in its fixed-width column as the safety net, never an `N8nBadge`/chip — clicking it opens the **client details dialog** with the brand mark + name header, Connected by / Connected on / Last active fields, the full grant as a vertical list grouped by Read-only / Write / Execute, and a destructive **Revoke access** footer — Last active, Connected on, and a trailing actions column whose hover-revealed **"Revoke access"** button also stays. It is the destination of the main page\'s "View all" row, and exists so the table can be evaluated on its own. Revoking every client (from rows or the dialog) swaps the table for the shared **"No clients connected yet"** empty state with the animated client-logo card cluster (static under `prefers-reduced-motion`).',
			},
		},
	},
};

export const McpWorkflowsAvailable: Story = {
	render: () => ({
		components,
		setup() {
			const onBack = () => alert('Back to Instance level MCP');

			const projects = mcpWorkflowProjects;
			const allWorkflows = projects.flatMap((project) => project.workflows);

			// Exposing a workflow to MCP is low-stakes and reversible, so — unlike the save-gated
			// Permissions sub-page — changes here are INSTANT: each toggle (and each bulk action)
			// persists immediately and is confirmed through the shared app notification. Editable
			// exposure is seeded (by id) from each workflow's default `exposed` flag; `workflow.active`
			// (the workflow's own on/off state in n8n) is independent and shown as a status badge.
			const exposed = ref<Record<string, boolean>>(
				Object.fromEntries(allWorkflows.map((workflow) => [workflow.id, workflow.exposed])),
			);

			const confirm = confirmSaved;

			// Instance-wide setting: auto-expose every newly-created workflow to MCP. Instant like the
			// per-workflow toggles, confirmed through the same notification. In the app/prototype this
			// lives in the shared store (so the enable follow-up dialog can flip it too); here a local
			// reactive ref is enough. Defaults OFF.
			const autoExposeNewWorkflows = ref(false);
			const onToggleAutoExpose = (value: boolean) => {
				autoExposeNewWorkflows.value = value;
				confirm(
					value ? 'New workflows will be exposed automatically' : 'New workflows will stay hidden',
				);
			};

			// Group-by table state (mirrors the Figma "group-by" pattern: one header row, then a
			// collapsible header per project, then its workflow rows). Collapse state is keyed by
			// project id and defaults to expanded.
			const collapsed = ref<Record<string, boolean>>({});
			const toggleCollapse = (project: McpWorkflowProject) => {
				collapsed.value[project.id] = !collapsed.value[project.id];
			};

			// Exposure filter (segmented control): 'all' shows everything, 'enabled'/'disabled' narrow
			// to exposed/hidden workflows. Empty groups are hidden so the table stays tight.
			const filter = ref('all');
			const filterOptions = [
				{ label: 'All', value: 'all' },
				{ label: 'Exposed', value: 'exposed' },
				{ label: 'Hidden', value: 'hidden' },
			];
			const matchesFilter = (workflow: McpWorkflow) => {
				if (filter.value === 'exposed') return exposed.value[workflow.id];
				if (filter.value === 'hidden') return !exposed.value[workflow.id];
				return true;
			};
			const visibleWorkflows = (project: McpWorkflowProject) =>
				project.workflows.filter(matchesFilter);
			const visibleProjects = computed(() =>
				projects.filter((project) => visibleWorkflows(project).length > 0),
			);

			const exposedInProject = (project: McpWorkflowProject) =>
				project.workflows.filter((workflow) => exposed.value[workflow.id]).length;
			const projectSummary = (project: McpWorkflowProject) =>
				`${exposedInProject(project)} of ${project.workflows.length} exposed`;
			const totalExposed = computed(
				() => allWorkflows.filter((workflow) => exposed.value[workflow.id]).length,
			);

			// Selection model for the bulk expose/hide action, keyed by workflow id. Selection works
			// across groups; the header checkbox selects every VISIBLE row, each group header checkbox
			// selects that group's visible rows.
			const selected = ref<Record<string, boolean>>({});
			const selectedIds = computed(() =>
				allWorkflows.map((workflow) => workflow.id).filter((id) => selected.value[id]),
			);
			const selectedCount = computed(() => selectedIds.value.length);
			const visibleIds = computed(() =>
				visibleProjects.value.flatMap((project) =>
					visibleWorkflows(project).map((workflow) => workflow.id),
				),
			);
			const allVisibleSelected = computed(
				() => visibleIds.value.length > 0 && visibleIds.value.every((id) => selected.value[id]),
			);
			const someVisibleSelected = computed(
				() => visibleIds.value.some((id) => selected.value[id]) && !allVisibleSelected.value,
			);
			const groupSelectionState = (project: McpWorkflowProject) => {
				const ids = visibleWorkflows(project).map((workflow) => workflow.id);
				const checked = ids.length > 0 && ids.every((id) => selected.value[id]);
				return { checked, indeterminate: !checked && ids.some((id) => selected.value[id]) };
			};

			const setSelected = (ids: string[], value: boolean) => {
				ids.forEach((id) => {
					selected.value[id] = value;
				});
			};
			const toggleSelectWorkflow = (workflow: McpWorkflow, value: boolean) => {
				selected.value[workflow.id] = value;
			};
			const toggleSelectGroup = (project: McpWorkflowProject, value: boolean) => {
				setSelected(
					visibleWorkflows(project).map((workflow) => workflow.id),
					value,
				);
			};
			const toggleSelectAll = (value: boolean) => setSelected(visibleIds.value, value);
			const clearSelection = () => {
				selected.value = {};
			};

			const onToggleWorkflow = (workflow: McpWorkflow, value: boolean) => {
				exposed.value[workflow.id] = value;
				confirm(value ? `${workflow.name} exposed to MCP` : `${workflow.name} hidden from MCP`);
			};

			// Bulk action from the selection toolbar: expose/hide every selected workflow at once, then
			// clear the selection and confirm with the app notification.
			const applyBulkExposure = (value: boolean) => {
				const count = selectedIds.value.length;
				selectedIds.value.forEach((id) => {
					exposed.value[id] = value;
				});
				clearSelection();
				const noun = count === 1 ? 'workflow' : 'workflows';
				confirm(value ? `${count} ${noun} exposed to MCP` : `${count} ${noun} hidden from MCP`);
			};
			const onBulkExpose = () => applyBulkExposure(true);
			const onBulkHide = () => applyBulkExposure(false);

			// Shared grid track for the header + workflow rows so the checkbox gutter, workflow column,
			// status, and exposure toggle line up. The two fixed columns are structural widths (no
			// spacing token maps to them); gaps and padding stay tokenised.
			const rowColumns = 'grid-template-columns: var(--spacing--lg) minmax(0, 1fr) 96px 64px;';

			return {
				onBack,
				autoExposeNewWorkflows,
				onToggleAutoExpose,
				visibleProjects,
				visibleWorkflows,
				exposed,
				collapsed,
				toggleCollapse,
				filter,
				filterOptions,
				projectSummary,
				totalExposed,
				totalWorkflows: allWorkflows.length,
				selected,
				selectedCount,
				allVisibleSelected,
				someVisibleSelected,
				groupSelectionState,
				toggleSelectWorkflow,
				toggleSelectGroup,
				toggleSelectAll,
				clearSelection,
				onToggleWorkflow,
				onBulkExpose,
				onBulkHide,
				rowColumns,
			};
		},
		// Full-height scrollable viewport like the other MCP pages. No floating save bar: exposure is
		// instant, so each change is confirmed through the shared app notification.
		template: `
			<div style="height: 100vh; overflow-y: auto; background: var(--background--subtle);">
				<N8nSettingsLayout show-back back-label="Back to Instance level MCP" @back="onBack">
					<N8nSettingsPageHeader
						title="Workflows available"
						description="Choose which workflows connected clients can reach over MCP, grouped by project. Changes apply immediately."
						docs-url="https://docs.n8n.io/manage-cloud/mcp-access/"
					/>

					<!-- Instance-wide auto-expose setting: newly-created workflows are exposed to MCP the
					     moment they're made. Instant toggle, confirmed via the app notification. -->
					<N8nSettingsSection>
						<N8nSettingsRowGroup>
							<N8nSettingsRow
								title="Auto-expose new workflows"
								description="Automatically expose newly created workflows to connected clients"
							>
								<template #action>
									<N8nSwitch :model-value="autoExposeNewWorkflows" @update:model-value="onToggleAutoExpose" />
								</template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>

					<!-- Toolbar: bulk-selection actions appear on the left when rows are selected; the exposure filter stays on the right. -->
					<div style="display: flex; align-items: center; justify-content: space-between; gap: var(--spacing--sm); flex-wrap: wrap; min-height: var(--spacing--xl);">
						<div style="display: flex; align-items: center; gap: var(--spacing--2xs); min-width: 0;">
							<template v-if="selectedCount > 0">
								<N8nText size="small" bold color="text-dark">{{ selectedCount }} selected</N8nText>
								<N8nButton size="small" variant="solid" label="Expose" @click="onBulkExpose" />
								<N8nButton size="small" variant="outline" label="Hide" @click="onBulkHide" />
								<N8nButton size="small" variant="ghost" label="Clear" @click="clearSelection" />
							</template>
							<N8nText v-else size="small" color="text-light">{{ totalExposed }} of {{ totalWorkflows }} workflows exposed to MCP</N8nText>
						</div>
						<N8nRadioButtons :model-value="filter" :options="filterOptions" size="small" @update:model-value="filter = $event" />
					</div>

					<!-- Group-by table: a column header, then a collapsible header per project, then its workflow rows. -->
					<div style="border: var(--border-width, 1px) solid var(--border-color--subtle); border-radius: var(--radius); overflow: clip; background: var(--background--surface);">
						<div :style="'display: grid; ' + rowColumns + ' align-items: center; column-gap: var(--spacing--sm); padding: var(--spacing--2xs) var(--spacing--sm); background: var(--background--subtle); border-bottom: var(--border-width, 1px) solid var(--border-color--subtle);'">
							<N8nCheckbox
								:model-value="allVisibleSelected"
								:indeterminate="someVisibleSelected"
								aria-label="Select all workflows"
								@update:model-value="toggleSelectAll"
							/>
							<N8nText size="xsmall" bold color="text-light">Workflow</N8nText>
							<N8nText size="xsmall" bold color="text-light">Status</N8nText>
							<N8nText size="xsmall" bold color="text-light">Exposed</N8nText>
						</div>

						<template v-for="project in visibleProjects" :key="project.id">
							<div style="display: flex; align-items: center; gap: var(--spacing--2xs); padding: var(--spacing--xs) var(--spacing--sm); background: var(--background--subtle); border-bottom: var(--border-width, 1px) solid var(--border-color--subtle);">
								<N8nCheckbox
									:model-value="groupSelectionState(project).checked"
									:indeterminate="groupSelectionState(project).indeterminate"
									:aria-label="'Select all ' + project.name + ' workflows'"
									@update:model-value="(value) => toggleSelectGroup(project, value)"
								/>
								<button
									type="button"
									:aria-expanded="!collapsed[project.id]"
									:aria-label="(collapsed[project.id] ? 'Expand ' : 'Collapse ') + project.name"
									style="display: inline-flex; align-items: center; justify-content: center; padding: var(--spacing--5xs); border: none; background: transparent; color: var(--color--text--tint-1); cursor: pointer; border-radius: var(--radius);"
									@click="toggleCollapse(project)"
								>
									<N8nIcon
										icon="chevron-down"
										size="small"
										:style="{ transition: 'transform 0.2s ease-in-out', transform: collapsed[project.id] ? 'rotate(-90deg)' : 'none' }"
									/>
								</button>
								<N8nAvatar :first-name="project.name" size="small" />
								<N8nText bold size="medium" color="text-dark">{{ project.name }}</N8nText>
								<N8nBadge theme="default">{{ projectSummary(project) }}</N8nBadge>
							</div>

							<template v-if="!collapsed[project.id]">
								<div
									v-for="workflow in visibleWorkflows(project)"
									:key="workflow.id"
									:style="'display: grid; ' + rowColumns + ' align-items: center; column-gap: var(--spacing--sm); padding: var(--spacing--xs) var(--spacing--sm); border-bottom: var(--border-width, 1px) solid var(--border-color--subtle);'"
								>
									<N8nCheckbox
										:model-value="!!selected[workflow.id]"
										:aria-label="'Select ' + workflow.name"
										@update:model-value="(value) => toggleSelectWorkflow(workflow, value)"
									/>
									<div style="display: flex; align-items: center; gap: var(--spacing--2xs); min-width: 0;">
										<N8nIcon icon="workflow" color="text-light" />
										<div style="display: flex; flex-direction: column; min-width: 0;">
											<N8nText size="small" color="text-dark" :style="{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">{{ workflow.name }}</N8nText>
											<N8nText size="xsmall" color="text-light" :style="{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">{{ workflow.description }}</N8nText>
										</div>
									</div>
									<div>
										<N8nBadge :theme="workflow.active ? 'success' : 'default'">{{ workflow.active ? 'Active' : 'Inactive' }}</N8nBadge>
									</div>
									<div style="display: flex; justify-content: flex-start;">
										<N8nSwitch
											:model-value="exposed[workflow.id]"
											:aria-label="'Expose ' + workflow.name + ' to MCP'"
											@update:model-value="(value) => onToggleWorkflow(workflow, value)"
										/>
									</div>
								</div>
							</template>
						</template>

						<div v-if="visibleProjects.length === 0" style="padding: var(--spacing--md) var(--spacing--sm);">
							<N8nText size="small" color="text-light">No workflows match this filter.</N8nText>
						</div>
					</div>
				</N8nSettingsLayout>
			</div>
		`,
	}),
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				story:
					'The **Workflows available** sub-page reached from the Instance level MCP page\'s Access section, rebuilt as a **group-by table** (mirroring the Figma group-by pattern) over the workflows connected clients can read and run. A single bordered table carries one column header (`Workflow` / `Status` / `Exposed`) and a **collapsible header row per project** — a disclosure chevron, an `N8nAvatar` (project initials), the name, and a live "N of M exposed" count — followed by that project\'s workflow rows. Each workflow row shows a `workflow` icon, its name + trigger/purpose, an Active/Inactive `N8nBadge` (the workflow\'s own state, independent of exposure), and an `N8nSwitch` that **instantly** exposes or hides it from MCP (confirmed through the existing app notification, unlike the save-gated Permissions page). A segmented **`N8nRadioButtons`** filter (All / Enabled / Disabled) narrows the rows and hides empty groups. A **selection** column (`N8nCheckbox`) supports multi-select across groups — header and per-group checkboxes select the visible rows — and a **selection toolbar** ("N selected — Enable / Disable / Clear") appears to bulk-expose or bulk-hide every selected workflow at once. Sample data spans Personal, Developer Platform, Solutions Engineering, and Security Hub.',
			},
		},
	},
};
