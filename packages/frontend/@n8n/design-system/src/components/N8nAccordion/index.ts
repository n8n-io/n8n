/**
 * Design-system Accordion primitives.
 * Re-export Reka Accordion parts so product code imports from `@n8n/design-system`
 * instead of `reka-ui`. Product code owns layout and styles.
 */
export {
	AccordionRoot as N8nAccordion,
	AccordionRoot as N8nAccordionRoot,
	AccordionItem as N8nAccordionItem,
	AccordionHeader as N8nAccordionHeader,
	AccordionTrigger as N8nAccordionTrigger,
	AccordionContent as N8nAccordionContent,
} from './reka-ui';

export type {
	AccordionContentProps,
	AccordionHeaderProps,
	AccordionItemProps,
	AccordionRootEmits,
	AccordionRootProps,
	AccordionTriggerProps,
} from './reka-ui';
