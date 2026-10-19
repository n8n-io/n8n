/** Renders every item as a button, so tests can pick one without opening the menu. */
export const ActionDropdownTestStub = {
	name: 'ActionDropdown',
	template:
		'<div><slot name="activator" /><button v-for="item in items" :key="item.id" :data-testid="item.testId" :disabled="item.disabled" @click="$emit(\'select\', item.id)">{{ item.label }} {{ item.description }}</button></div>',
	props: ['items', 'placement', 'teleported'],
	emits: ['select'],
};
