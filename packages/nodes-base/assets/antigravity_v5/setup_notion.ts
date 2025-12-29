import { fetch } from 'undici'; // Or rely on native fetch if Node 18+
import dotenv from 'dotenv';
import path from 'path';

// Load Env from api-key-manager
dotenv.config({ path: path.resolve(__dirname, '../../../api-key-manager/.env') });

// --- Type Definitions ---
interface NotionSelectOption {
	name: string;
	color: string;
}

interface NotionPropertySchema {
	[key: string]: {
		title?: object;
		rich_text?: object;
		number?: { format: string };
		select?: { options: NotionSelectOption[] };
	};
}

interface NotionDatabasePayload {
	parent: { type: 'page_id'; page_id: string };
	title: Array<{ type: 'text'; text: { content: string } }>;
	properties: NotionPropertySchema;
}

// --- Configuration ---
// Renamed Keys (Server-Side Only)
const NOTION_API_KEY = process.env.NOTION_KEY || process.env.VITE_NOTION_KEY;
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

// --- Main Execution ---
async function setupNotion() {
	console.log('🏗️ Starting Notion Database Setup...');

	try {
		// 1. Pre-Flight Checks
		if (!NOTION_API_KEY || !PARENT_PAGE_ID) {
			throw new Error('Missing Env Vars: NOTION_API_KEY or NOTION_PARENT_PAGE_ID');
		}

		// 2. Construct Payload
		const payload: NotionDatabasePayload = {
			parent: {
				type: 'page_id',
				page_id: PARENT_PAGE_ID,
			},
			title: [
				{
					type: 'text',
					text: {
						content: 'Master Control [Antigravity]',
					},
				},
			],
			properties: {
				Command: { title: {} },
				Status: {
					select: {
						options: [
							{ name: 'Pending', color: 'gray' },
							{ name: 'In Progress', color: 'blue' },
							{ name: 'Done', color: 'green' },
							{ name: 'Error', color: 'red' },
						],
					},
				},
				Agent_ID: { rich_text: {} },
				Recursion_Depth: { number: { format: 'number' } },
				Output_Log: { rich_text: {} },
			},
		};

		// 3. Execute Request (Using native fetch or undici)
		const response = await fetch('https://api.notion.com/v1/databases', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${NOTION_API_KEY}`,
				'Content-Type': 'application/json',
				'Notion-Version': '2022-06-28',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Notion API Error (${response.status}): ${errorText}`);
		}

		const data = await response.json();
		console.log('✅ SUCCESS: Notion Database Created!');
		console.log(`   Database ID: ${(data as any).id}`);
	} catch (error) {
		console.error('❌ SETUP FAILED');
		if (error instanceof Error) {
			console.error(`   Reason: ${error.message}`);
		}
		process.exit(1);
	}
}

setupNotion();
