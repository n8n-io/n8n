import { defineRegistry } from '@json-render/vue';
import { h } from 'vue';
import { catalog } from './catalog';
import Accordion from './components/Accordion.vue';
import AiTask from './components/AiTask.vue';
import Approval from './components/Approval.vue';
import CalendarEvent from './components/CalendarEvent.vue';
import Callout from './components/Callout.vue';
import ChatMessage from './components/ChatMessage.vue';
import Crm from './components/Crm.vue';
import Database from './components/Database.vue';
import Decision from './components/Decision.vue';
import Email from './components/Email.vue';
import FileTransfer from './components/FileTransfer.vue';
import Form from './components/Form.vue';
import Grid from './components/Grid.vue';
import Group from './components/Group.vue';
import Heading from './components/Heading.vue';
import HttpCall from './components/HttpCall.vue';
import Knowledge from './components/Knowledge.vue';
import Screen from './components/Screen.vue';
import Sms from './components/Sms.vue';
import Spreadsheet from './components/Spreadsheet.vue';
import Stack from './components/Stack.vue';
import Step from './components/Step.vue';
import Tabs from './components/Tabs.vue';
import Terminal from './components/Terminal.vue';
import Text from './components/Text.vue';
import Timeline from './components/Timeline.vue';
import Transform from './components/Transform.vue';
import Wait from './components/Wait.vue';
import When from './components/When.vue';

export const { registry } = defineRegistry(catalog, {
	components: {
		Screen: ({ props, children }) => h(Screen, props, { default: () => children }),
		Stack: ({ props, children }) => h(Stack, props, { default: () => children }),
		Group: ({ props, children }) => h(Group, props, { default: () => children }),
		Heading: ({ props }) => h(Heading, props),
		Text: ({ props }) => h(Text, props),
		Callout: ({ props }) => h(Callout, props),
		When: ({ props, emit }) => h(When, { ...props, onPress: () => emit('press') }),
		Form: ({ props, emit }) => h(Form, { ...props, onPress: () => emit('press') }),
		ChatMessage: ({ props, emit }) => h(ChatMessage, { ...props, onPress: () => emit('press') }),
		Email: ({ props, emit }) => h(Email, { ...props, onPress: () => emit('press') }),
		Sms: ({ props, emit }) => h(Sms, { ...props, onPress: () => emit('press') }),
		HttpCall: ({ props, emit }) => h(HttpCall, { ...props, onPress: () => emit('press') }),
		Terminal: ({ props, emit }) => h(Terminal, { ...props, onPress: () => emit('press') }),
		FileTransfer: ({ props, emit }) => h(FileTransfer, { ...props, onPress: () => emit('press') }),
		Spreadsheet: ({ props, emit }) => h(Spreadsheet, { ...props, onPress: () => emit('press') }),
		Database: ({ props, emit }) => h(Database, { ...props, onPress: () => emit('press') }),
		Crm: ({ props, emit }) => h(Crm, { ...props, onPress: () => emit('press') }),
		CalendarEvent: ({ props, emit }) =>
			h(CalendarEvent, { ...props, onPress: () => emit('press') }),
		Decision: ({ props, emit }) => h(Decision, { ...props, onPress: () => emit('press') }),
		Wait: ({ props, emit }) => h(Wait, { ...props, onPress: () => emit('press') }),
		Approval: ({ props, emit }) => h(Approval, { ...props, onPress: () => emit('press') }),
		AiTask: ({ props, emit }) => h(AiTask, { ...props, onPress: () => emit('press') }),
		Knowledge: ({ props, emit }) => h(Knowledge, { ...props, onPress: () => emit('press') }),
		Transform: ({ props, emit }) => h(Transform, { ...props, onPress: () => emit('press') }),
		Step: ({ props, emit }) => h(Step, { ...props, onPress: () => emit('press') }),
		Grid: ({ props, children }) => h(Grid, props, { default: () => children }),
		Tabs: ({ props, children }) => h(Tabs, props, { default: () => children }),
		Accordion: ({ props, children }) => h(Accordion, props, { default: () => children }),
		Timeline: ({ props, children }) => h(Timeline, props, { default: () => children }),
	},
	actions: {
		openNode: () => Promise.resolve(),
	},
});
