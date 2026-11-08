/**
 * Styled accordion parts.
 * Re-export the Vue wrappers so product code imports from `@n8n/design-system`
 * instead of `reka-ui`.
 */
export { default as N8nAccordion, default as N8nAccordionRoot } from './Accordion.vue';
export { default as N8nAccordionItem } from './AccordionItem.vue';
export { default as N8nAccordionHeader } from './AccordionHeader.vue';
export { default as N8nAccordionTrigger } from './AccordionTrigger.vue';
export { default as N8nAccordionContent } from './AccordionContent.vue';

export type {
	AccordionContentProps,
	AccordionHeaderProps,
	AccordionItemProps,
	AccordionRootEmits,
	AccordionRootProps,
	AccordionTriggerProps,
} from './reka-ui';
