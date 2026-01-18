const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-2048, 7776], name: 'When clicking ‘Execute workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1466231493,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/10IMnD8JhiR4lTlNFQTG_Auopg8haAiEt3_G9EKWTqLw/edit#gid=1466231493',
						cachedResultName: 'Senior_data',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '10IMnD8JhiR4lTlNFQTG_Auopg8haAiEt3_G9EKWTqLw',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/10IMnD8JhiR4lTlNFQTG_Auopg8haAiEt3_G9EKWTqLw/edit?usp=drivesdk',
						cachedResultName: 'Student Details',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-1760, 7776],
				name: 'Get Student Data1',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					text: '=student:  {{ $json.StudentID }}, Name: {{ $json.Name }}, Program: {{ $json.Program }} Year: {{ $json.Year }} Completed Courses: {{ $json.CompletedCourses }}',
					options: {
						systemMessage:
							'You are a university degree-audit assistant. Your job is to analyze each student’s completed courses against the hard-coded program requirements and catalog below, then output only what they are still missing.\n\nPROGRAM REQUIREMENTS (HARD-CODED)\n\nComputer Science BS\n\nTotal Credits Required: 120\n\nGen Ed Credits Required: 36\n\nMajor Core Courses: CS-101, CS-102, CS-103, CS-201, CS-220\n\nMajor Elective Credits Required: 12 (any CS course with “Major Elective”)\n\nUpper-Division Credits Required: 30 (courses level ≥ 200)\n\nBusiness Administration BBA\n\nTotal Credits Required: 120\n\nGen Ed Credits Required: 36\n\nMajor Core Courses: BUS-101, BUS-102, BUS-103, BUS-201, BUS-202\n\nMajor Elective Credits Required: 12 (BUS electives level ≥ 200)\n\nUpper-Division Credits Required: 30\n\nPsychology BA\n\nTotal Credits Required: 120\n\nGen Ed Credits Required: 42\n\nMajor Core Courses: PSY-101, PSY-201\n\nMajor Elective Credits Required: 18 (PSY electives level ≥ 200)\n\nUpper-Division Credits Required: 27\n\nMechanical Engineering BS\n\nTotal Credits Required: 128\n\nGen Ed Credits Required: 30\n\nMajor Core Courses: ENGR-101, ENGR-102, MTH-121, MTH-122, PHY-151, ME-201\n\nMajor Elective Credits Required: 12 (ME electives level ≥ 200)\n\nUpper-Division Credits Required: 36\n\nBiology BS (Pre-Med)\n\nTotal Credits Required: 124\n\nGen Ed Credits Required: 36\n\nMajor Core Courses: BIO-101, BIO-102, CHM-101, CHM-102, BIO-201\n\nMajor Elective Credits Required: 9 (BIO electives level ≥ 200)\n\nUpper-Division Credits Required: 30\n\nEnglish Literature BA\n\nTotal Credits Required: 120\n\nGen Ed Credits Required: 42\n\nMajor Core Courses: ENG-101, ENG-201\n\nMajor Elective Credits Required: 18 (ENG electives level ≥ 200)\n\nUpper-Division Credits Required: 27\n\nData Science BS\n\nTotal Credits Required: 120\n\nGen Ed Credits Required: 36\n\nMajor Core Courses: CS-101, CS-102, DS-101, DS-201\n\nMajor Elective Credits Required: 12 (DS electives level ≥ 200)\n\nUpper-Division Credits Required: 30\n\nNursing BSN\n\nTotal Credits Required: 124\n\nGen Ed Credits Required: 36\n\nMajor Core Courses: BIO-101, CHM-101, NUR-101, NUR-201\n\nMajor Elective Credits Required: 9 (NUR electives level ≥ 200)\n\nUpper-Division Credits Required: 30\n\nEconomics BA\n\nTotal Credits Required: 120\n\nGen Ed Credits Required: 36\n\nMajor Core Courses: ECON-101, ECON-102, ECON-201\n\nMajor Elective Credits Required: 12 (ECON electives level ≥ 200)\n\nUpper-Division Credits Required: 27\n\nGraphic Design BFA\n\nTotal Credits Required: 120\n\nGen Ed Credits Required: 30\n\nMajor Core Courses: ART-101, ART-102, ART-201\n\nMajor Elective Credits Required: 18 (ART electives level ≥ 200)\n\nUpper-Division Credits Required: 30\n\nOUTPUT RULES\n\nFor each student, output valid JSON only.\n\nOutput must be a JSON array of objects.\n\nEach object must include:\n\n"StudentID"\n\n"Program"\n\n"Missing" → array of strings, each formatted "COURSEID | Title | Credits" (list the missing Major Core, plus indicate Gen Ed/Elective requirements if still needed)\n\n"Summary" → 1–2 sentences explaining what they’re missing and what to prioritize next (mention 200/300-level if upper-division is short).\n\nWould you like me to now fill in a JSON example for one program (e.g., Computer Science BS with Ava Thompson’s courses) so you see exactly how the Missing list and Summary would look?\n\nOutput like this. \n\n{\n  "StudentID": "S001",\n  "Program": "Example Program",\n  "Missing": [\n    "CS-201 | Computer Systems | 3",\n    "CS-220 | Databases | 3",\n    "GEN-107 | Introduction to Sociology | 3"\n  ],\n  "Summary": "Student still needs two core Computer Science courses and one general education requirement. Should prioritize 200-level major courses next term."\n}\n',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [-1120, 7552],
				name: 'Degree Audit Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					columns: {
						value: {
							StudentID: '={{ $json.output.StudentID }}',
							'AI Degree Summary': '={{ $json.output.Summary }}',
						},
						schema: [
							{
								id: 'StudentID',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'StudentID',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Name',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Program',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Program',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Year',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Year',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'CompletedCourses',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'CompletedCourses',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Degree Summary',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Degree Summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'AI Degree Summary',
								type: 'string',
								display: true,
								required: false,
								displayName: 'AI Degree Summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['StudentID'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1466231493,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/10IMnD8JhiR4lTlNFQTG_Auopg8haAiEt3_G9EKWTqLw/edit#gid=1466231493',
						cachedResultName: 'Senior_data',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '10IMnD8JhiR4lTlNFQTG_Auopg8haAiEt3_G9EKWTqLw',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/10IMnD8JhiR4lTlNFQTG_Auopg8haAiEt3_G9EKWTqLw/edit?usp=drivesdk',
						cachedResultName: 'Student Details',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-720, 7568],
				name: 'Add Student Degree Summary',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: {
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'gpt-5',
						cachedResultName: 'gpt-5',
					},
					options: {},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [-1344, 8048],
				name: 'OpenAI Chat Model1',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.3,
			config: {
				parameters: {
					jsonSchemaExample:
						'{\n  "StudentID": "S001",\n  "Program": "Example Program",\n  "Missing": [\n    "CS-201 | Computer Systems | 3",\n    "CS-220 | Databases | 3",\n    "GEN-107 | Introduction to Sociology | 3"\n  ],\n  "Summary": "Student still needs two core Computer Science courses and one general education requirement. Should prioritize 200-level major courses next term."\n}\n',
				},
				position: [-1120, 8032],
				name: 'Structured Output Parser1',
			},
		}),
	)
	.add(
		sticky(
			'### 1) Connect Google Sheets (OAuth2)\n1. In **n8n → Credentials → New → Google Sheets (OAuth2)**  \n2. Sign in with your Google account and grant access  \n3. In each Google Sheets node, select your **Spreadsheet** and the appropriate **Worksheet**:  \n   - **data** (raw spend)  \n   - **Lookup** (channel reference table)  \n   - **render pivot** (output tab)  \n\nhttps://docs.google.com/spreadsheets/d/10IMnD8JhiR4lTlNFQTG_Auopg8haAiEt3_G9EKWTqLw/edit?gid=1466231493#gid=1466231493\n',
			{ name: 'Sticky Note68', color: 3, position: [-1840, 7248], width: 224, height: 656 },
		),
	)
	.add(
		sticky(
			'### 3) Connect OpenAI (API Key)\n1. In **n8n → Credentials → New → OpenAI API**  \n2. Paste your **OpenAI API key**  \n3. In **OpenAI Chat Model**, select your credential and a **vision-capable** chat model (e.g., `gpt-4o-mini`, `gpt-4o`, or your configured vision model)\n',
			{ name: 'Sticky Note69', color: 3, position: [-1424, 7744], width: 224, height: 400 },
		),
	)
	.add(
		sticky(
			'## 🔎 Audit student degree progress in Google Sheets using OpenAI\n\nRun an **AI-powered degree audit** for each senior student. This workflow reads rows from a Google Sheet, checks their completed courses against hard-coded program requirements, and writes back a summary of what’s still missing — core classes, electives, general education, and upper-division credits.\n',
			{ name: 'Sticky Note57', color: 7, position: [-2304, 7136], width: 2144, height: 1056 },
		),
	)
	.add(
		sticky(
			'## Setup (2 steps)\n\n### 1) Connect Google Sheets (OAuth2)\nIn n8n → Credentials → New → Google Sheets (OAuth2) and sign in.\n\nIn the Google Sheets nodes, select your spreadsheet and the Senior_data tab.\n\nEnsure your input sheet has at least: StudentID, Name, Program, Year, CompletedCourses.\n\n### 2) Connect OpenAI (API Key)\nIn n8n → Credentials → New → OpenAI API, paste your key.\n\nIn the OpenAI Chat Model node, select that credential and a model (e.g., gpt-4o or gpt-5).\n\n\n\n- 📧 **rbreen@ynteractive.com**  \n- 🔗 **Robert Breen** — https://www.linkedin.com/in/robert-breen-29429625/  \n- 🌐 **ynteractive.com** — https://ynteractive.com\n\n',
			{ name: 'Sticky Note5', position: [-2736, 7136], width: 400, height: 1056 },
		),
	);
