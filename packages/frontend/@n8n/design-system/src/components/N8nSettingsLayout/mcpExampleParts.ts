// Support module for the "Instance level MCP" Storybook example (see McpExample.stories.ts):
// the inlined client brand marks, the animated empty-state logo cards, small presentational
// helpers (StatusDot, CopyInput, BrandButton, AutoHeight), the example's page-level style
// injections, and the connected-client fixtures + details dialog. Storybook-demo-only code —
// nothing here is exported from the design system itself.
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

import N8nButton from '../N8nButton';
import {
	N8nDialog,
	N8nDialogClose,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
} from '../N8nDialog';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import N8nInput from '../N8nInput';
import N8nText from '../N8nText';

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
export const clientLogoComponents = markRaw<Record<string, Component>>({
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
export const ClientLogoCards = defineComponent({
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
export const StatusDot = defineComponent({
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
export const CopyInput = defineComponent({
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
export const BrandButton = defineComponent({
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
export const AutoHeight = defineComponent({
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
export const mcpToolGroups: McpToolGroup[] = [
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

export const mcpToolCount = mcpToolGroups.reduce((total, group) => total + group.tools.length, 0);

// Default per-tool allow-list — 4 of 7 allowed: read-only is mixed (3/4), write is mixed (1/2), and
// execute stays off by default. Drives the main page's "4 of 7 allowed" Permissions summary.
export const defaultMcpAllowed: Record<string, boolean> = {
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
export interface McpClient {
	id: string;
	name: string;
	type: string;
	icon: IconName;
	connectedBy: string;
	permissions: string[];
	lastActive: string;
	connectedOn: string;
}
export const mcpClients: McpClient[] = [
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
export const clientAccessSummary = (client: McpClient) => {
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
export const ClientDetailsDialog = defineComponent({
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
