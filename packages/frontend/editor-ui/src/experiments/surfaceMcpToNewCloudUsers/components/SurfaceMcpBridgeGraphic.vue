<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { computed } from 'vue';

type Size = 'hero' | 'inline' | 'tile';

const props = withDefaults(
	defineProps<{
		size?: Size;
		ariaLabel?: string;
	}>(),
	{
		size: 'hero',
		ariaLabel: 'MCP connects n8n with AI agents',
	},
);

const isTile = computed(() => props.size === 'tile');
const isHero = computed(() => props.size === 'hero');
</script>

<template>
	<div
		:class="[$style.bridge, $style[`bridge--${size}`]]"
		role="img"
		:aria-label="ariaLabel"
		data-test-id="surface-mcp-bridge-graphic"
	>
		<template v-if="!isTile">
			<!-- Right node: n8n logo -->
			<div :class="[$style.node, $style.nodeN8n]" data-test-id="surface-mcp-bridge-n8n-logo">
				<svg viewBox="0 0 32 26" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
					<path
						fill-rule="evenodd"
						clip-rule="evenodd"
						d="M27.2 11.3955C26.4903 11.3959 25.8006 11.1603 25.2394 10.7259C24.6783 10.2914 24.2774 9.68271 24.1 8.99555H20.433C20.0543 8.9956 19.6879 9.12999 19.3989 9.3748C19.11 9.61962 18.9173 9.95899 18.855 10.3325L18.723 11.1225C18.6018 11.8478 18.2346 12.5092 17.683 12.9955C18.2348 13.4821 18.6021 14.1439 18.723 14.8695L18.855 15.6585C18.9173 16.0321 19.11 16.3715 19.3989 16.6163C19.6879 16.8611 20.0543 16.9955 20.433 16.9955H20.901C21.0968 16.2424 21.5603 15.5864 22.2047 15.1502C22.8491 14.714 23.6303 14.5275 24.4023 14.6255C25.1743 14.7236 25.8841 15.0995 26.399 15.6829C26.9139 16.2663 27.1987 17.0174 27.2 17.7955C27.2015 18.5755 26.9182 19.3292 26.4031 19.9149C25.8881 20.5006 25.1769 20.8781 24.4031 20.9764C23.6294 21.0746 22.8464 20.8869 22.2013 20.4485C21.5562 20.0101 21.0935 19.3511 20.9 18.5955H20.433C19.6756 18.5954 18.9428 18.3267 18.3649 17.837C17.787 17.3474 17.4015 16.6687 17.277 15.9215L17.145 15.1325C17.0828 14.759 16.89 14.4196 16.6011 14.1748C16.3121 13.93 15.9457 13.7956 15.567 13.7955H14.299C14.1214 14.4823 13.7206 15.0907 13.1596 15.525C12.5987 15.9593 11.9094 16.1949 11.2 16.1949C10.4906 16.1949 9.80129 15.9593 9.24036 15.525C8.67943 15.0907 8.27866 14.4823 8.10101 13.7955H6.29901C6.1032 14.5487 5.63975 15.2047 4.99533 15.6409C4.35091 16.0771 3.56967 16.2636 2.7977 16.1656C2.02573 16.0675 1.31592 15.6916 0.800999 15.1082C0.286083 14.5247 0.00133389 13.7737 6.20563e-06 12.9955C-0.00152906 12.2156 0.281849 11.4619 0.796882 10.8762C1.31191 10.2905 2.02314 9.91299 2.79689 9.81474C3.57064 9.71649 4.35363 9.90421 4.99871 10.3426C5.6438 10.781 6.10655 11.44 6.30001 12.1955H8.10001C8.27697 11.5079 8.67758 10.8985 9.23878 10.4635C9.79998 10.0284 10.4899 9.79229 11.2 9.79229C11.9101 9.79229 12.6 10.0284 13.1612 10.4635C13.7224 10.8985 14.123 11.5079 14.3 12.1955H15.567C15.9457 12.1955 16.3121 12.0611 16.6011 11.8163C16.89 11.5715 17.0828 11.2321 17.145 10.8585L17.277 10.0685C17.4017 9.32161 17.7873 8.64311 18.3652 8.15368C18.943 7.66425 19.6757 7.39562 20.433 7.39555H24.101C24.2968 6.64242 24.7603 5.9864 25.4047 5.5502C26.0491 5.114 26.8303 4.92747 27.6023 5.02552C28.3743 5.12356 29.0841 5.49945 29.599 6.0829C30.1139 6.66634 30.3987 7.41738 30.4 8.19555C30.4 9.04424 30.0629 9.85817 29.4627 10.4583C28.8626 11.0584 28.0487 11.3955 27.2 11.3955ZM27.2 9.79555C27.6244 9.79555 28.0313 9.62698 28.3314 9.32692C28.6314 9.02686 28.8 8.61989 28.8 8.19555C28.8 7.7712 28.6314 7.36423 28.3314 7.06418C28.0313 6.76412 27.6244 6.59555 27.2 6.59555C26.7757 6.59555 26.3687 6.76412 26.0686 7.06418C25.7686 7.36423 25.6 7.7712 25.6 8.19555C25.6 8.61989 25.7686 9.02686 26.0686 9.32692C26.3687 9.62698 26.7757 9.79555 27.2 9.79555ZM3.20001 14.5955C3.62435 14.5955 4.03132 14.427 4.33138 14.1269C4.63144 13.8269 4.80001 13.4199 4.80001 12.9955C4.80001 12.5712 4.63144 12.1642 4.33138 11.8642C4.03132 11.5641 3.62435 11.3955 3.20001 11.3955C2.77566 11.3955 2.36869 11.5641 2.06864 11.8642C1.76858 12.1642 1.60001 12.5712 1.60001 12.9955C1.60001 13.4199 1.76858 13.8269 2.06864 14.1269C2.36869 14.427 2.77566 14.5955 3.20001 14.5955ZM12.8 12.9955C12.8 13.2057 12.7586 13.4137 12.6782 13.6078C12.5978 13.802 12.48 13.9783 12.3314 14.1269C12.1828 14.2755 12.0064 14.3933 11.8123 14.4738C11.6182 14.5542 11.4101 14.5955 11.2 14.5955C10.9899 14.5955 10.7818 14.5542 10.5877 14.4738C10.3936 14.3933 10.2172 14.2755 10.0686 14.1269C9.92006 13.9783 9.80221 13.802 9.7218 13.6078C9.64139 13.4137 9.60001 13.2057 9.60001 12.9955C9.60001 12.5712 9.76858 12.1642 10.0686 11.8642C10.3687 11.5641 10.7757 11.3955 11.2 11.3955C11.6244 11.3955 12.0313 11.5641 12.3314 11.8642C12.6314 12.1642 12.8 12.5712 12.8 12.9955ZM25.6 17.7955C25.6 18.0057 25.5586 18.2137 25.4782 18.4078C25.3978 18.602 25.28 18.7783 25.1314 18.9269C24.9828 19.0755 24.8064 19.1933 24.6123 19.2738C24.4182 19.3542 24.2101 19.3955 24 19.3955C23.7899 19.3955 23.5818 19.3542 23.3877 19.2738C23.1936 19.1933 23.0172 19.0755 22.8686 18.9269C22.7201 18.7783 22.6022 18.602 22.5218 18.4078C22.4414 18.2137 22.4 18.0057 22.4 17.7955C22.4 17.3712 22.5686 16.9642 22.8686 16.6642C23.1687 16.3641 23.5757 16.1955 24 16.1955C24.4244 16.1955 24.8313 16.3641 25.1314 16.6642C25.4314 16.9642 25.6 17.3712 25.6 17.7955Z"
						fill="currentColor"
					/>
				</svg>
			</div>

			<!-- Connector: agents -> n8n -->
			<span
				:class="[$style.connector, $style.connectorToN8n, { [$style.connectorAnimated]: isHero }]"
				aria-hidden="true"
			>
				<svg viewBox="0 0 64 8" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
					<line
						x1="0"
						y1="4"
						x2="64"
						y2="4"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-dasharray="2 5"
					/>
				</svg>
			</span>
			<!-- Left node: stacked agent marks -->
			<div :class="[$style.node, $style.nodeAgents]" data-test-id="surface-mcp-bridge-agent-logos">
				<span :class="[$style.agent, $style.agentStacked, $style.agentClaude]">
					<svg
						:class="$style.agentIcon"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						data-test-id="surface-mcp-bridge-claude-logo"
					>
						<path
							d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 0 1-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z"
							fill="#D97757"
						/>
					</svg>
				</span>
				<span :class="[$style.agent, $style.agentStacked, $style.agentCodex]">
					<svg
						:class="$style.agentIcon"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
						data-test-id="surface-mcp-bridge-codex-logo"
					>
						<path
							d="M19.503 0H4.496A4.496 4.496 0 000 4.496v15.007A4.496 4.496 0 004.496 24h15.007A4.496 4.496 0 0024 19.503V4.496A4.496 4.496 0 0019.503 0z"
							fill="#fff"
						/>
						<path
							d="M9.064 3.344a4.578 4.578 0 012.285-.312c1 .115 1.891.54 2.673 1.275.01.01.024.017.037.021a.09.09 0 00.043 0 4.55 4.55 0 013.046.275l.047.022.116.057a4.581 4.581 0 012.188 2.399c.209.51.313 1.041.315 1.595a4.24 4.24 0 01-.134 1.223.123.123 0 00.03.115c.594.607.988 1.33 1.183 2.17.289 1.425-.007 2.71-.887 3.854l-.136.166a4.548 4.548 0 01-2.201 1.388.123.123 0 00-.081.076c-.191.551-.383 1.023-.74 1.494-.9 1.187-2.222 1.846-3.711 1.838-1.187-.006-2.239-.44-3.157-1.302a.107.107 0 00-.105-.024c-.388.125-.78.143-1.204.138a4.441 4.441 0 01-1.945-.466 4.544 4.544 0 01-1.61-1.335c-.152-.202-.303-.392-.414-.617a5.81 5.81 0 01-.37-.961 4.582 4.582 0 01-.014-2.298.124.124 0 00.006-.056.085.085 0 00-.027-.048 4.467 4.467 0 01-1.034-1.651 3.896 3.896 0 01-.251-1.192 5.189 5.189 0 01.141-1.6c.337-1.112.982-1.985 1.933-2.618.212-.141.413-.251.601-.33.215-.089.43-.164.646-.227a.098.098 0 00.065-.066 4.51 4.51 0 01.829-1.615 4.535 4.535 0 011.837-1.388zm3.482 10.565a.637.637 0 000 1.272h3.636a.637.637 0 100-1.272h-3.636zM8.462 9.23a.637.637 0 00-1.106.631l1.272 2.224-1.266 2.136a.636.636 0 101.095.649l1.454-2.455a.636.636 0 00.005-.64L8.462 9.23z"
							fill="url(#surface-mcp-codex-gradient)"
						/>
						<defs>
							<linearGradient
								id="surface-mcp-codex-gradient"
								gradientUnits="userSpaceOnUse"
								x1="12"
								x2="12"
								y1="3"
								y2="21"
							>
								<stop stop-color="#B1A7FF" />
								<stop offset=".5" stop-color="#7A9DFF" />
								<stop offset="1" stop-color="#3941FF" />
							</linearGradient>
						</defs>
					</svg>
				</span>
				<span :class="[$style.agent, $style.agentStacked, $style.agentCursor]">
					<svg
						:class="$style.agentIcon"
						viewBox="0 0 24 24"
						fill="currentColor"
						fill-rule="evenodd"
						xmlns="http://www.w3.org/2000/svg"
						data-test-id="surface-mcp-bridge-cursor-logo"
					>
						<path
							d="M22.106 5.68L12.5.135a.998.998 0 00-.998 0L1.893 5.68a.84.84 0 00-.419.726v11.186c0 .3.16.577.42.727l9.607 5.547a.999.999 0 00.998 0l9.608-5.547a.84.84 0 00.42-.727V6.407a.84.84 0 00-.42-.726zm-.603 1.176L12.228 22.92c-.063.108-.228.064-.228-.061V12.34a.59.59 0 00-.295-.51l-9.11-5.26c-.107-.062-.063-.228.062-.228h18.55c.264 0 .428.286.296.514z"
						/>
					</svg>
				</span>
				<span :class="[$style.agent, $style.agentOpenAi]">
					<svg
						:class="$style.agentIcon"
						viewBox="0 0 24 24"
						fill="currentColor"
						fill-rule="evenodd"
						xmlns="http://www.w3.org/2000/svg"
						data-test-id="surface-mcp-bridge-openai-logo"
					>
						<path
							d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z"
						/>
					</svg>
				</span>
			</div>
		</template>

		<!-- Tile variant: simplified center MCP icon flanked by 2 dots -->
		<template v-else>
			<span :class="[$style.tileDot, $style.tileDotLeft]" aria-hidden="true" />
			<span :class="$style.tileConnector" aria-hidden="true">
				<svg viewBox="0 0 24 8" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
					<line
						x1="0"
						y1="4"
						x2="24"
						y2="4"
						stroke="currentColor"
						stroke-width="1.25"
						stroke-linecap="round"
						stroke-dasharray="2 4"
					/>
				</svg>
			</span>
			<div :class="[$style.node, $style.nodeMcp, $style.tileMcp]">
				<span :class="$style.mcpHalo" aria-hidden="true" />
				<N8nIcon icon="mcp" :class="$style.mcpIcon" />
			</div>
			<span :class="$style.tileConnector" aria-hidden="true">
				<svg viewBox="0 0 24 8" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
					<line
						x1="0"
						y1="4"
						x2="24"
						y2="4"
						stroke="currentColor"
						stroke-width="1.25"
						stroke-linecap="round"
						stroke-dasharray="2 4"
					/>
				</svg>
			</span>
			<span :class="[$style.tileDot, $style.tileDotRight]" aria-hidden="true" />
		</template>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion.scss' as motion;

.bridge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
	color: var(--icon-color--strong);
}

// --- Sizes -----------------------------------------------------------------

.bridge--hero {
	gap: var(--spacing--2xs);

	.node {
		width: 56px;
		height: 56px;
	}

	.nodeMcp {
		width: 72px;
		height: 72px;
	}

	.nodeN8n svg {
		width: 32px;
		height: auto;
	}

	.mcpIcon {
		font-size: 36px;
	}

	.connector {
		width: 96px;
	}

	.agent {
		width: 38px;
		height: 38px;
	}

	.agentStacked {
		margin-right: -12px;
	}

	.agentIcon {
		width: 18px;
		height: 18px;
	}
}

.bridge--inline {
	gap: var(--spacing--4xs);

	.node {
		width: 28px;
		height: 28px;
	}

	.nodeMcp {
		width: 36px;
		height: 36px;
	}

	.nodeN8n svg {
		width: 18px;
		height: auto;
	}

	.mcpIcon {
		font-size: 20px;
	}

	.connector {
		width: 24px;
	}

	.agent {
		width: 22px;
		height: 22px;
	}

	.agentStacked {
		margin-right: -7px;
	}

	.agentIcon {
		width: 11px;
		height: 11px;
	}
}

.bridge--tile {
	gap: var(--spacing--4xs);

	.tileMcp {
		width: 40px;
		height: 40px;
	}

	.mcpIcon {
		font-size: 22px;
	}
}

// --- Nodes -----------------------------------------------------------------

.node {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	border-radius: var(--radius--full);
}

.nodeN8n {
	order: 3;
	background: var(--background--surface);
	border: 1px solid var(--border-color--subtle);
	color: var(--color--orange-500);
	box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.nodeMcp {
	background: var(--background--surface);
	border: 1px solid var(--border-color--subtle);
	color: var(--icon-color--strong);
	box-shadow: 0 2px 8px rgb(234 75 113 / 8%);
	z-index: 1;
}

.mcpHalo {
	position: absolute;
	inset: -4px;
	border-radius: var(--radius--full);
	background: radial-gradient(circle, rgb(234 152 75 / 18%) 0%, rgb(234 152 75 / 0%) 70%);
	z-index: -1;
	pointer-events: none;
}

.nodeAgents {
	order: 1;
	display: inline-flex;
	align-items: center;
	background: transparent;
	border: 0;
	width: auto !important; // override .node sizing - this is a stack, not a single circle
	height: auto !important;
	border-radius: 0;
}

.agent {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--radius--full);
	background: var(--background--surface);
	border: 1px solid var(--border-color--subtle);
	box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
	color: var(--icon-color--strong);
}

.agentClaude {
	z-index: 4;
}

.agentCodex {
	z-index: 3;
}

.agentCursor {
	z-index: 2;
}

.agentOpenAi {
	color: var(--icon-color--strong);
}

// --- Connectors ------------------------------------------------------------

.connector {
	display: inline-flex;
	align-items: center;
	height: 8px;
	color: var(--border-color--strong);

	svg {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	line {
		stroke-dashoffset: 0;
	}
}

.connectorToN8n {
	order: 2;
}

.connectorAnimated line {
	animation: dashFlow 1.6s linear infinite;

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}

@keyframes dashFlow {
	from {
		stroke-dashoffset: 0;
	}
	to {
		stroke-dashoffset: -14;
	}
}

// --- Tile variant pieces ---------------------------------------------------

.tileDot {
	display: inline-block;
	width: 8px;
	height: 8px;
	border-radius: var(--radius--full);
	flex-shrink: 0;
}

.tileDotLeft {
	background: var(--color--orange-500);
	box-shadow: 0 0 0 3px rgb(234 152 75 / 16%);
}

.tileDotRight {
	background: var(--icon-color--strong);
	box-shadow: 0 0 0 3px rgb(0 0 0 / 6%);
}

.tileConnector {
	display: inline-flex;
	align-items: center;
	width: 18px;
	height: 8px;
	color: var(--border-color--strong);

	svg {
		display: block;
		width: 100%;
		height: 100%;
	}
}
</style>
