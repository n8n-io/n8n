<script lang="ts" setup>
import type { PropType } from 'vue';
import { GenericValue } from 'n8n-workflow';
import { useI18n } from '@/composables/useI18n';

const i18n = useI18n();

const props = defineProps({
    content: {
        type: [Object, String, Number] as PropType<GenericValue>,
    },
    search: {
        type: String,
    }
});

const splitTextBySearch = (text = '', search = ''): {tag: 'span' | 'mark', content: string}[] => {
	if (!search) {
		return [
			{
				tag: 'span',
				content: text,
			}
		]
	}

	const pattern = new RegExp(`(${search})`, 'g');
	const splitText = text.split(new RegExp(pattern, 'gi'));

	return splitText.map((t) => ({ tag: pattern.test(t)? 'mark' : 'span', content: t }));
}

const getValueToRender = (value: GenericValue): string => {
    if (value === '') {
        return i18n.baseText('runData.emptyString');
    }
    if (typeof value === 'string') {
        return value.replaceAll('\n', '\\n');
    }
    if (Array.isArray(value) && value.length === 0) {
        return i18n.baseText('runData.emptyArray');
    }
    if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
        return i18n.baseText('runData.emptyObject');
    }
    if (value === null || value === undefined) {
        return `[${value}]`;
    }
    if (value === true || value === false || typeof value === 'number') {
        return value.toString();
    }

    return JSON.stringify(value);
};


const highlightSearchTerm = (value: GenericValue): { tag: 'span' | 'mark', content: string }[] => {
    const content = getValueToRender(value);

    return splitTextBySearch(content, props.search);
}

</script>

<template>
    <span>
        <template v-for="part in highlightSearchTerm(props.content)">
            <mark v-if="part.tag === 'mark'">{{ part.content }}</mark>
            <span v-else>{{ part.content }}</span>
        </template>
    </span>
</template>
