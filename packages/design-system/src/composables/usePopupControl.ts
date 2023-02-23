import { ComponentPublicInstance, onMounted, onUnmounted, ref, Ref, watch } from 'vue';
import { focusFirstDescendant, extractRefHTMLElement, off, on } from '../utils';
import {
	arrow,
	autoUpdate,
	computePosition,
	flip,
	offset,
	shift,
	Placement,
} from '@floating-ui/dom';

export type PopupEvent = 'hover' | 'click' | 'focus' | 'manual';

export function usePopupControl(props: {
	triggerRef: Ref<ComponentPublicInstance | HTMLElement | null>;
	popupRef: Ref<HTMLElement | null>;
	arrowRef: Ref<HTMLElement | null>;
	componentProps: Ref<{
		disabled?: boolean;
		readonly?: boolean;
		events: PopupEvent | PopupEvent[];
		placement: Placement;
		interactable: boolean;
		visible?: boolean;
		animationDuration: number;
		hoverHideDelay: number;
		offset: number;
	}>;
	emit: (event: any, ...args: any[]) => void;
}) {
	const visible = ref(props.componentProps.value.visible);
	const instance = ref<() => void>();
	const animating = ref(false);
	const triggerStack = ref(0);

	onMounted(() => {
		addEventListeners();
	});

	onUnmounted(() => {
		removeEventListeners();
	});

	watch(
		() => props.componentProps.value.visible,
		(value) => {
			if (value) {
				show();
			} else {
				hide();
			}
		},
	);

	function addEventListeners() {
		const triggerRef = extractRefHTMLElement(props.triggerRef);
		const popupRef = extractRefHTMLElement(props.popupRef);

		if (!triggerRef || !popupRef) {
			return;
		}

		([] as PopupEvent[]).concat(props.componentProps.value.events).forEach((trigger) => {
			switch (trigger) {
				case 'hover':
					on(triggerRef, 'mouseenter', props.componentProps.value.interactable ? hoverShow : show);
					on(triggerRef, 'mouseleave', props.componentProps.value.interactable ? hoverHide : hide);

					if (props.componentProps.value.interactable) {
						on(popupRef, 'mouseenter', hoverShow);
						on(popupRef, 'mouseleave', hoverHide);
					}
					break;
				case 'click':
					on(triggerRef, 'click', onClick);
					break;
				case 'focus':
					for (const child of triggerRef.children) {
						on(child as HTMLElement, 'focus', show);
						on(child as HTMLElement, 'blur', hide);
					}
					break;
				default:
					break;
			}
		});
	}

	function removeEventListeners() {
		const triggerRef = extractRefHTMLElement(props.triggerRef);
		const popupRef = extractRefHTMLElement(props.popupRef);

		if (!triggerRef || !popupRef) {
			return;
		}

		([] as PopupEvent[]).concat(props.componentProps.value.events).forEach((trigger) => {
			switch (trigger) {
				case 'hover':
					off(triggerRef, 'mouseenter', props.componentProps.value.interactable ? hoverShow : show);
					off(triggerRef, 'mouseleave', props.componentProps.value.interactable ? hoverHide : hide);

					if (props.componentProps.value.interactable) {
						off(popupRef, 'mouseenter', hoverShow);
						off(popupRef, 'mouseleave', hoverHide);
					}
					break;
				case 'click':
					off(triggerRef, 'click', onClick);
					break;
				case 'focus':
					for (const child of triggerRef.children) {
						off(child as HTMLElement, 'focus', show);
						off(child as HTMLElement, 'blur', hide);
					}
					break;
				default:
					break;
			}
		});
	}

	function show() {
		if (
			props.componentProps.value.disabled ||
			props.componentProps.value.readonly ||
			visible.value
		) {
			return;
		}

		triggerStack.value += 1;
		visible.value = true;

		createPopup();

		props.emit('update:visible', true);
	}

	function hide() {
		if (
			props.componentProps.value.disabled ||
			props.componentProps.value.readonly ||
			!visible.value
		) {
			return;
		}

		triggerStack.value -= 1;

		if (triggerStack.value <= 0) {
			triggerStack.value = 0;
			visible.value = false;

			props.emit('update:visible', false);

			setTimeout(() => destroyPopup(), props.componentProps.value.animationDuration);
		}
	}

	function onClick() {
		if (visible.value) {
			hide();
		} else {
			show();
		}
	}

	function onClickOutside() {
		props.emit('click:outside');

		if (!props.componentProps.value.visible) {
			hide();
		}
	}

	function onKeyEscape() {
		hide();
	}

	function hoverShow() {
		animating.value = false;
		show();
	}

	function hoverHide() {
		animating.value = true;
		setTimeout(() => {
			if (animating.value) {
				hide();
			}
		}, props.componentProps.value.hoverHideDelay);
	}

	function createPopup() {
		if (typeof window === 'undefined') {
			return;
		}

		const triggerRef = extractRefHTMLElement(props.triggerRef);
		const popupRef = extractRefHTMLElement(props.popupRef);
		const arrowRef = extractRefHTMLElement(props.arrowRef);

		if (!triggerRef || !popupRef) {
			throw new Error('Trigger and popup elements are required.');
		}

		instance.value = autoUpdate(triggerRef, popupRef, async () => {
			const { x, y, placement, middlewareData } = await computePosition(triggerRef, popupRef, {
				placement: props.componentProps.value.placement,
				strategy: 'fixed',
				middleware: [
					offset(props.componentProps.value.offset),
					flip(),
					shift({ padding: 6 }),
				].concat(arrowRef ? [arrow({ element: arrowRef })] : []),
			});

			Object.assign(popupRef.style, {
				left: `${x}px`,
				top: `${y}px`,
			});

			popupRef?.setAttribute('data-popup-placement', placement);

			// Accessing the data
			if (arrowRef) {
				const { x: arrowX, y: arrowY } = middlewareData.arrow as {
					x: number;
					y: number;
				};

				const staticSide = {
					top: 'bottom',
					right: 'left',
					bottom: 'top',
					left: 'right',
				}[placement.split('-')[0]];

				Object.assign(arrowRef.style, {
					left: arrowX !== null ? `${arrowX}px` : '',
					top: arrowY !== null ? `${arrowY}px` : '',
					right: '',
					bottom: '',
					[staticSide as string]: '-6px',
				});
			}
		});
	}

	function destroyPopup() {
		if (instance.value) {
			instance.value();
			instance.value = undefined;
		}
	}

	function focusTrigger() {
		const triggerRef = extractRefHTMLElement(props.triggerRef);

		if (!triggerRef) {
			return;
		}

		for (const child of triggerRef.children) {
			if (focusFirstDescendant(child as HTMLElement)) {
				(child as HTMLElement).focus();
				break;
			}
		}
	}

	return {
		visible,
		show,
		hide,
		onClick,
		onClickOutside,
		onKeyEscape,
		focusTrigger,
		createPopup,
		destroyPopup,
	};
}
