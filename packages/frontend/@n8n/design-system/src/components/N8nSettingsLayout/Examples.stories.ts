import type { Meta, StoryObj } from '@storybook/vue3-vite';
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
import N8nSelect from '../N8nSelect';
import N8nSettingsPageHeader from '../N8nSettingsPageHeader';
import N8nSettingsRow from '../N8nSettingsRow';
import N8nSettingsRowConfigure from '../N8nSettingsRowConfigure';
import N8nSettingsRowGroup from '../N8nSettingsRowGroup';
import N8nSettingsSaveBar from '../N8nSettingsSaveBar';
import { confirmSaved } from '../N8nSettingsSaveBar/quickSaveNotification';
import N8nSettingsSection from '../N8nSettingsSection';
import N8nSwitch from '../N8nSwitch';
import N8nText from '../N8nText';

const meta = {
	title: 'Instance Settings/Examples',
	component: N8nSettingsLayout,
	parameters: {
		docs: {
			description: {
				component:
					'Composed examples mirroring the Figma examples frame: a Security & login page (leading visual slot + merged sub-section), a This instance page (metrics custom row + back action), and an API keys page (full-width table beneath a header that stays centered in the 720px column). The **Example Settings Page** wires the floating `N8nSettingsSaveBar` to a realistic dirty-state flow — editing a high-impact field slides the bar up, Discard reverts and Save confirms through the existing app notification (the bottom-right `ElNotification` that `useToast()` shows in the app), while a low-impact toggle saves instantly. The **Model Context Protocol** story re-expresses the instance-level MCP page in the native settings system: it enables/disables the server through a single **MCP status** status-action control (shown only while enabled: a green pulsing-dot "Enabled" dropdown whose danger "Disable" item opens an `N8nDialog` confirmation) rather than a toggle — collapsing to a dashed-border empty state, the sole enable affordance, while disabled — folds the **Connection details** inline as a client-led flow (a searchable, three-category "Client" picker that drives a dividerless group of official `N8nSettingsRow`s whose copyable values use `CopyInput` (readonly `N8nInput` + copy button): CLI Install/Configure/Authenticate, a web-client one-click "Add to …" row, or IDE deep-link + Server URL/token/Configure rows), summarizes **Access** ("4 of 7 allowed" Permissions, "12 across 4 projects" Workflows available — the dedicated sub-pages behind those rows are not part of this story set), and previews **Connected clients** inline. Access is granted **per connected client** (like PostHog\'s "Connected applications"): each preview row renders its grant as muted **plain truncated text** ("List workflows, Get workflow details +5" — never chips) that opens a **client details dialog** (brand mark + name, Connected by / Connected on / Last active, the full grant grouped by tool type, and a destructive Revoke access).',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

// One-shot check used by the animated prototypes to skip decorative motion. Deliberately not
// reactive: each animation reads it when it starts, matching how the CSS media query gates the
// equivalent declarative transitions.
const prefersReducedMotion = () =>
	typeof window !== 'undefined' &&
	typeof window.matchMedia === 'function' &&
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

// Maps a connected-client id to its inlined brand mark, used by the main-page preview and the
// Connect picker; anything unmapped falls back to the client's DS icon. `markRaw` keeps the
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

		const leftIndex = ref(0);
		const rightIndex = ref(Math.floor(logoCardsCycle.length / 2));
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
				leftIndex.value = (leftIndex.value + 1) % logoCardsCycle.length;
				leftFading.value = false;
			}, LOGO_CARDS_FADE_MS);
		};
		const swapRight = () => {
			rightFading.value = true;
			rightSwapTimer = window.setTimeout(() => {
				rightIndex.value = (rightIndex.value + 1) % logoCardsCycle.length;
				rightFading.value = false;
			}, LOGO_CARDS_FADE_MS);
		};

		onMounted(() => {
			if (prefersReducedMotion()) return;
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

		return { logos: logoCardsCycle, leftIndex, rightIndex, leftFading, rightFading };
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
		const reduceMotion = prefersReducedMotion();
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
			:class="{ 'mcp-copy-input--inline': !multiline }"
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

// The brand-mark components are not registered here: they render exclusively through
// `<component :is>` with component objects, which needs no registration.
const components = {
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
	N8nSwitch,
	N8nButton,
	N8nDialog,
	N8nDialogClose,
	N8nDialogFooter,
	N8nInput,
	N8nSelect,
	N8nOption,
	N8nIcon,
	N8nText,
	// Cast the generic data-table and dropdown menu to plain Components so their generic
	// signatures don't leak into (and break) the Storybook render-function types.
	N8nDataTableServer: N8nDataTableServer as unknown as Component,
	N8nDropdownMenu: N8nDropdownMenu as unknown as Component,
};

// Wrapper style shared by every full-page story so each reads as a real, full-height scrollable
// settings page (no windowed box) on the app's subtle background. The flex column is part of the
// floating save bar contract: the bar (last child, `margin-top: auto`) gets pushed to the bottom
// of the scrollport even when the page content is shorter than the viewport, where its sticky
// offset gives the usual 24px gap; on long pages the auto margin has no free space to absorb, so
// scrolling behavior is unchanged.
const fullPageViewportStyle =
	'height: 100vh; overflow-y: auto; display: flex; flex-direction: column; background: var(--background--subtle);';

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
			<div style="${fullPageViewportStyle}">
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
	tools: McpTool[];
}

// Shared MCP tool catalog, grouped by what each tool can do. The main page's "4 of 7 allowed"
// summary counts it, and the client details dialog groups each connection's grant back under its
// Read-only / Write / Execute headings.
const mcpToolGroups: McpToolGroup[] = [
	{
		id: 'read',
		title: 'Read-only',
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
// execute stays off by default. Drives the main page's "4 of 7 allowed" Permissions summary.
const defaultMcpAllowed: Record<string, boolean> = {
	listWorkflows: true,
	getWorkflow: true,
	getExecution: true,
	searchProjects: false,
	upsertWorkflows: true,
	upsertDataTables: false,
	executeWorkflows: false,
};

// Sample connected clients shown in the main page preview.
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
	icon: IconName;
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

// One-line Access summary for the connected-clients preview: the first two granted permissions as
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
			permissions: group.tools
				.filter((tool) => client.permissions.includes(tool.title))
				.map((tool) => tool.title),
		}))
		.filter((group) => group.permissions.length > 0);

// The Access text in the connected-clients preview is a real button (it opens the client details
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

// Full connection details for ONE connected client, opened by clicking a preview row's Access
// text. Composed from the dialog primitives (instead of the `header` string prop) so the header
// carries the client's brand mark next to its name. The body is a label/value grid — Connected by /
// Connected on / Last active — followed by Access: the FULL grant as a clean vertical list of plain
// permission rows grouped under the catalog's Read-only / Write / Execute headings (no chips). The
// footer's destructive "Revoke access" emits `revoke` so the host page removes the client (same as
// the rows' hover-revealed revoke) and closes. Styles are injected once (fixed id), as above.
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

// Sample instance content behind the main page's Workflows available summary ("12 across 4
// projects"). Only the counts show on the page; the per-workflow exposure UI lives on a dedicated
// sub-page that is not part of this story set.
const mcpWorkflowCount = 12;
const mcpWorkflowProjectCount = 4;

// ---------------------------------------------------------------------------
// Connection details — the client-led setup catalogue behind the Connect dialog: the same server
// URL for every client, a masked token, and a per-client descriptor whose `category` drives the
// setup UI. CLI clients carry install/auth commands + an alternative config file; IDEs carry a
// deep link + a manual config file; web clients carry a one-click connector URL.
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
			// button: the grouped picker + tailored setup steps, nothing else — no footer and no
			// in-dialog consent, because granting access is the CLIENT's move: in reality the
			// configured client initiates the OAuth flow against the instance and n8n's authorization
			// (consent) screen opens in a new tab. That consent screen is not part of this story set,
			// so here closing the dialog is simply closing the dialog.
			const showConnectDialog = ref(false);
			const onOpenConnect = () => {
				showConnectDialog.value = true;
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
			// Enabling is instant (low-stakes), then a follow-up dialog offers to expose every workflow
			// on the instance right away. Enabling flips on immediately + confirms; the dialog is the
			// optional next step (not a gate).
			const showExposeAllDialog = ref(false);
			const onEnable = () => {
				enabled.value = true;
				confirmSaved('MCP access enabled');
				showExposeAllDialog.value = true;
			};
			// "Expose all workflows" from the follow-up dialog. In the app/prototype this flips every
			// workflow's exposure (and the auto-expose-new flag) in the shared store so the Workflows
			// available page reflects it; here the main page and that page are separate story instances,
			// so this just closes + confirms to keep the UX demonstrable.
			const onExposeAll = () => {
				showExposeAllDialog.value = false;
				confirmSaved('All workflows exposed to MCP');
			};
			const onConfirmDisable = () => {
				enabled.value = false;
				showDisableDialog.value = false;
				confirmSaved('MCP access disabled');
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
			// client-led flow, reading the module-scope catalogue (mcpServerUrl / mcpClientCatalog /
			// mcpClientCategories).
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
				confirmSaved(message);
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
			// access itself is edited on a dedicated, save-gated Permissions sub-page (not part of
			// this story set).
			const allowedCount = Object.values(defaultMcpAllowed).filter(Boolean).length;
			const allowedSummary = `${allowedCount} of ${mcpToolCount} allowed`;

			// Workflows available summary ("12 across 4 projects"), read from the shared counts.
			const workflowsSummary = `${mcpWorkflowCount} across ${mcpWorkflowProjectCount} projects`;

			// Connected clients preview + "View all".
			const previewClients = computed(() => clients.value.slice(0, 3));
			// Only surface the "All connected clients / View all" row when there are MORE clients than
			// the inline preview already shows — otherwise it's redundant.
			const showViewAll = computed(() => clients.value.length > previewClients.value.length);
			// The Access rows and the "View all" row lead to dedicated sub-pages (the save-gated
			// Permissions page, Workflows available, and the full Connected clients table) that are
			// not part of this story set, so the clicks stub the navigation the same way the other
			// stories stub their back links.
			const onOpenPermissions = () => alert('Open the Permissions sub-page');
			const onOpenWorkflows = () => alert('Open the Workflows available sub-page');
			const onViewAllClients = () => alert('Open the Connected clients sub-page');
			const onRevokeClient = (client: McpClient) => {
				clients.value = clients.value.filter((c) => c.id !== client.id);
				confirmSaved(`${client.name} disconnected`);
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

			return {
				enabled,
				showDisableDialog,
				showConnectDialog,
				detailsClient,
				showDetailsDialog,
				onOpenClientDetails,
				onRevokeFromDetails,
				accessSummary: clientAccessSummary,
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
			<div style="${fullPageViewportStyle}">
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
							<N8nSettingsRow
								title="MCP status"
								description="Connect AI assistants and IDEs like Claude, Cursor, and ChatGPT to this instance over MCP."
							>
								<template #action>
									<N8nDropdownMenu :items="disableMenuItems" placement="bottom-end" @select="onDisableMenuSelect">
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
								</template>
							</N8nSettingsRow>

							<!-- The client picker moves into a dialog. This row sits directly beneath
							     MCP status in the SAME group and just carries a prominent "Connect" button; the
							     grouped client picker + tailored setup steps live in the Connect dialog below. -->
							<N8nSettingsRow
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
				     in-dialog consent: like the real flow, granting access is the CLIENT's move — after
				     setup the client initiates OAuth and n8n asks for consent in a new tab (outside this
				     story set). The large preset keeps it comfortably wide for snippets. -->
				<N8nDialog
					v-model:open="showConnectDialog"
					size="large"
					header="Connect a client"
					description="Pick the client you want to connect, then follow the tailored setup steps. When your client connects, n8n asks you to grant it access in a new tab."
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
					'The main **Instance level MCP** page, re-expressed from the current instance-level MCP screen into the native settings system. **Connection** drops the old "Preview" badge and replaces the master toggle with a single **MCP status** status-action control, shown only while MCP is enabled: an outline **"Enabled"** trigger — a **green, gently pulsing dot** + a `chevron-down` — that opens an `N8nDropdownMenu` whose single, danger-styled **"Disable"** item opens an **`N8nDialog` confirmation** ("…will disconnect N connected clients and revoke their access"). Enabling stays instant while disabling stays gated, because a toggle would imply an instant, low-stakes change for something that exposes the instance. **When disabled**, the whole page below the header collapses to a single **dashed-border empty state**, the sole enable affordance (an **animated fanned trio of logo cards** — the static `mcp` mark in the raised centre card, flanked by two tilted cards cycling through the client brand marks with a staggered 300ms fade+blur swap every 3s, mimicking the External Secrets empty state from n8n PR #24685 and static under `prefers-reduced-motion` — above "Connect AI assistants to build and run workflows", the subtext "Let MCP clients like Claude Code and Cursor build, run, and iterate on workflows in your instance", and a centered button row — a ghost **"Learn more"** docs button with a trailing `arrow-up-right` icon (opens the docs in a new tab) to the left of the primary **"Enable MCP access"** button wired to the instant-enable handler); enabling reveals the full page with a gentle entrance animation (honouring `prefers-reduced-motion`). The **"No clients connected yet"** empty state reuses the same animated cluster with the `plug-zap` mark in the centre. **Connection details** is **client-led**: the first row is a **"Your client"** picker — a searchable `N8nDropdownMenu` grouped into three uppercase categories (**AI Agent CLI**, **Web Clients**, **IDE**) via disabled header items + `divided` separators, each client showing its real brand mark in the `#item-leading` slot (Cursor near-black `#26251e`, Claude Code coral `#D97757`, Codex purple→blue, VS Code blue-ribbon, ChatGPT/Claude.ai marks; DS-icon fallbacks for Gemini CLI / Windsurf). The selected client drives a **dividerless group of official `N8nSettingsRow`s** (matching the Figma installation section — each row carries its own title/description, and a `CopyInput` — a readonly monospace `N8nInput` paired with an icon-only copy `N8nButton` in its `#append` slot — renders the command/snippet/value inside the row\'s `#action`): **CLIs** (Claude Code, Codex, Gemini CLI) get **Install** → **Configure** → **Authenticate** rows, where Authenticate is a copyable command (Codex `codex mcp login`; Claude Code / Gemini the in-app `/mcp` command); **Web clients** (Claude.ai, ChatGPT) get a single **One-click setup** row whose action is a branded **"Add to …"** button; **IDEs** (Cursor, VS Code) get a **One-click setup** deep-link button row followed by **Server URL**, **Authentication token**, and **Configure** rows. Copies confirm via the existing app notification with contextual messages ("Server URL copied", "Token copied", "Config copied", "Command copied"). The dialog is deliberately **footerless** — client selection + setup steps only, no Cancel/Continue and no in-dialog consent — because granting access is the **client\'s** move, not the dialog\'s: in the real flow the configured client initiates OAuth and n8n asks for consent in a new tab (that authorization screen is not part of this story set). **Access** summarizes the save-gated **Permissions** sub-page (`N8nSettingsRowConfigure` "4 of 7 allowed") and the **Workflows available** sub-page ("12 across 4 projects"); these rows and the **Connected clients** "View all" row lead to dedicated sub-pages that are likewise out of scope here, so their clicks stub the navigation. **Connected clients** previews a few rows inline — each carrying a third, muted **Access** line: the client\'s granted permissions as **plain truncated text** ("List workflows, Get workflow details +5", the first two plus a "+N" overflow computed from the array — never chips) that opens the **client details dialog** (brand mark + name header, Connected by / Connected on / Last active fields, the full grant as a vertical list grouped by Read-only / Write / Execute, and a destructive **Revoke access** footer that removes the client like the row\'s hover-revealed button).',
			},
		},
	},
};
