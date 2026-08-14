import { defineRegistry } from '@json-render/vue';
import { h } from 'vue';
import { catalog } from './catalog';
import AdaptiveStoryboard from './components/AdaptiveStoryboard.vue';
import Accordion from './components/Accordion.vue';
import AiTask from './components/AiTask.vue';
import Approval from './components/Approval.vue';
import Beat from './components/Beat.vue';
import Branch from './components/Branch.vue';
import CalendarEvent from './components/CalendarEvent.vue';
import Callout from './components/Callout.vue';
import Caption from './components/Caption.vue';
import Chapter from './components/Chapter.vue';
import ChatMessage from './components/ChatMessage.vue';
import Cluster from './components/Cluster.vue';
import Crm from './components/Crm.vue';
import Database from './components/Database.vue';
import Decision from './components/Decision.vue';
import Email from './components/Email.vue';
import Ends from './components/Ends.vue';
import FileTransfer from './components/FileTransfer.vue';
import FlowCanvas from './components/FlowCanvas.vue';
import FlowConnection from './components/FlowConnection.vue';
import FlowNode from './components/FlowNode.vue';
import Form from './components/Form.vue';
import Grid from './components/Grid.vue';
import Group from './components/Group.vue';
import GuidedTimeline from './components/GuidedTimeline.vue';
import Heading from './components/Heading.vue';
import Hero from './components/Hero.vue';
import HttpCall from './components/HttpCall.vue';
import Knowledge from './components/Knowledge.vue';
import Lane from './components/Lane.vue';
import OutcomeBoard from './components/OutcomeBoard.vue';
import Reveal from './components/Reveal.vue';
import Screen from './components/Screen.vue';
import Sms from './components/Sms.vue';
import Split from './components/Split.vue';
import Spotlight from './components/Spotlight.vue';
import Spreadsheet from './components/Spreadsheet.vue';
import Stack from './components/Stack.vue';
import Step from './components/Step.vue';
import Summary from './components/Summary.vue';
import Tabs from './components/Tabs.vue';
import Terminal from './components/Terminal.vue';
import Text from './components/Text.vue';
import Timeline from './components/Timeline.vue';
import Transform from './components/Transform.vue';
import Wait from './components/Wait.vue';
import When from './components/When.vue';

function pressProps(on: (event: string) => { bound: boolean; emit: () => void }) {
	const press = on('press');
	return { pressBound: press.bound, onPress: press.emit };
}

export const { registry } = defineRegistry(catalog, {
	components: {
		Screen: ({ props, children }) => h(Screen, props, { default: () => children }),
		AdaptiveStoryboard: ({ props, children }) =>
			h(AdaptiveStoryboard, props, { default: () => children }),
		OutcomeBoard: ({ props, children }) => h(OutcomeBoard, props, { default: () => children }),
		GuidedTimeline: ({ props, children }) => h(GuidedTimeline, props, { default: () => children }),
		Hero: ({ props, children }) => h(Hero, props, { default: () => children }),
		Summary: ({ props }) => h(Summary, props),
		Chapter: ({ props, children }) => h(Chapter, props, { default: () => children }),
		Beat: ({ props, children }) => h(Beat, props, { default: () => children }),
		Caption: ({ props }) => h(Caption, props),
		Stack: ({ props, children }) => h(Stack, props, { default: () => children }),
		Split: ({ props, children }) => h(Split, props, { default: () => children }),
		Lane: ({ props, children }) => h(Lane, props, { default: () => children }),
		Ends: ({ props, children }) => h(Ends, props, { default: () => children }),
		FlowCanvas: ({ props, children }) => h(FlowCanvas, props, { default: () => children }),
		FlowNode: ({ props, children }) => h(FlowNode, props, { default: () => children }),
		FlowConnection: ({ props }) => h(FlowConnection, props),
		Branch: ({ props, children }) => h(Branch, props, { default: () => children }),
		Cluster: ({ props, children }) => h(Cluster, props, { default: () => children }),
		Spotlight: ({ props, children }) => h(Spotlight, props, { default: () => children }),
		Group: ({ props, children }) => h(Group, props, { default: () => children }),
		Heading: ({ props }) => h(Heading, props),
		Text: ({ props }) => h(Text, props),
		Callout: ({ props }) => h(Callout, props),
		When: ({ props, on }) => h(When, { ...props, ...pressProps(on) }),
		Form: ({ props, on }) => h(Form, { ...props, ...pressProps(on) }),
		ChatMessage: ({ props, on }) => h(ChatMessage, { ...props, ...pressProps(on) }),
		Email: ({ props, on }) => h(Email, { ...props, ...pressProps(on) }),
		Sms: ({ props, on }) => h(Sms, { ...props, ...pressProps(on) }),
		HttpCall: ({ props, on }) => h(HttpCall, { ...props, ...pressProps(on) }),
		Terminal: ({ props, on }) => h(Terminal, { ...props, ...pressProps(on) }),
		FileTransfer: ({ props, on }) => h(FileTransfer, { ...props, ...pressProps(on) }),
		Spreadsheet: ({ props, on }) => h(Spreadsheet, { ...props, ...pressProps(on) }),
		Database: ({ props, on }) => h(Database, { ...props, ...pressProps(on) }),
		Crm: ({ props, on }) => h(Crm, { ...props, ...pressProps(on) }),
		CalendarEvent: ({ props, on }) => h(CalendarEvent, { ...props, ...pressProps(on) }),
		Decision: ({ props, on }) => h(Decision, { ...props, ...pressProps(on) }),
		Wait: ({ props, on }) => h(Wait, { ...props, ...pressProps(on) }),
		Approval: ({ props, on }) => h(Approval, { ...props, ...pressProps(on) }),
		AiTask: ({ props, on }) => h(AiTask, { ...props, ...pressProps(on) }),
		Knowledge: ({ props, on }) => h(Knowledge, { ...props, ...pressProps(on) }),
		Transform: ({ props, on }) => h(Transform, { ...props, ...pressProps(on) }),
		Step: ({ props, on }) => h(Step, { ...props, ...pressProps(on) }),
		Grid: ({ props, children }) => h(Grid, props, { default: () => children }),
		Tabs: ({ props, children }) => h(Tabs, props, { default: () => children }),
		Accordion: ({ props, children }) => h(Accordion, props, { default: () => children }),
		Reveal: ({ props, children }) => h(Reveal, props, { default: () => children }),
		Timeline: ({ props, children }) => h(Timeline, props, { default: () => children }),
	},
	actions: {
		openNode: () => Promise.resolve(),
	},
});
