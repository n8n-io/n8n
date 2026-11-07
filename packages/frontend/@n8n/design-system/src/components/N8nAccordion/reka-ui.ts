/**
 * Local re-export shim for reka-ui.
 *
 * Accordion Vue files import reka-ui through this shim.
 * Storybook's vue-docgen-plugin can resolve package imports from this folder
 * to a broken relative path, so keep imports behind this shim.
 */
export {
	AccordionContent,
	AccordionHeader,
	AccordionItem,
	AccordionRoot,
	AccordionTrigger,
} from 'reka-ui';

export type {
	AccordionContentProps,
	AccordionHeaderProps,
	AccordionItemProps,
	AccordionRootEmits,
	AccordionRootProps,
	AccordionTriggerProps,
} from 'reka-ui';
