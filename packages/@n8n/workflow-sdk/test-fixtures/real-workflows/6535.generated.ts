const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.calTrigger',
			version: 2,
			config: {
				parameters: {
					events: ['BOOKING_CREATED'],
					options: { eventTypeId: 2098128 },
				},
				credentials: { calApi: { id: 'credential-id', name: 'calApi Credential' } },
				position: [-500, 140],
				name: 'Cal.com Trigger',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1167434515,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1uGw7lJteEbjDzgVyZ0yG2gs7yx0AcJOaTdZ7Q5q0Y9c/edit#gid=1167434515',
						cachedResultName: 'Data',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1uGw7lJteEbjDzgVyZ0yG2gs7yx0AcJOaTdZ7Q5q0Y9c',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1uGw7lJteEbjDzgVyZ0yG2gs7yx0AcJOaTdZ7Q5q0Y9c/edit?usp=drivesdk',
						cachedResultName: 'Apollo, Marketing Consultants, May 20 FINAL',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-220, 100],
				name: 'Google Sheets',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.filter',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: 'd4bbf33f-a2fb-4d96-b1c8-ebb0958bae33',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.email }}',
								rightValue: 'user@example.com',
							},
						],
					},
				},
				position: [80, 140],
				name: 'Filter',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api-bcbe5a.stack.tryrelevance.com/latest/studios/8ac2aaa8-3d38-4d92-9b6f-65a19a5cc17a/trigger_webhook?project=4518f8138206-4b6c-8b8a-8dd5b17d95fa',
					method: 'POST',
					options: {},
					jsonBody: '={"linkedin_url":"{{ $json.profileUrl }}","last_x_days":30}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [340, 140],
				name: 'Scrape Profiles + Posts - Relevance AI',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'const input = $node["Scrape Profiles + Posts - Relevance AI"].json;\n\n// Getting posts from output, then fallback to top-level.\nconst posts = (input.output && input.output.last_30_days_posts_transformed) \n  || input.last_30_days_posts_transformed \n  || [];\n\n// Build HTML for each LinkedIn post\nlet postsHTML = \'\';\nif (Array.isArray(posts)) {\n  posts.forEach(post => {\n    postsHTML += `<div class="linkedin-post" style="border:1px solid #ddd; padding:10px; margin-bottom:10px;">\n      <p>${post.user_post}</p>\n      <p><em>Posted on: ${post.posted}</em></p>\n    </div>`;\n  });\n}\n\n// Return only the generated HTML\nreturn [{ json: { postsHTML } }];\n',
				},
				position: [560, 140],
				name: 'Posts',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'// Get the input data from the first item\nconst input = $node["Scrape Profiles + Posts - Relevance AI"].json;\n\n// Navigate to the experiences array within the "output" object\nconst experiences = input.linkedin_profile_details_data?.experiences || [];\n// Build the HTML table rows string\nlet htmlRows = \'\';\nexperiences.forEach(exp => {\n  htmlRows += `<tr>\n      <td>${exp.company}</td>\n      <td>${exp.title}</td>\n      <td>${exp.date_range}</td>\n      <td>${exp.location}</td>\n    </tr>`;\n});\n\n// Return a new object that only contains the experiencesTable field\nreturn [{ json: { experiencesTable: htmlRows } }];\n',
				},
				position: [740, 140],
				name: 'Experiences',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'// Get the input data from the first item\nconst input = $node["Scrape Profiles + Posts - Relevance AI"].json;\n\n// Navigate to the educations array in the output object\nconst educations = input.linkedin_profile_details_data?.educations || [];\n// Build the HTML table rows for education\nlet educationRows = \'\';\neducations.forEach(edu => {\n  educationRows += `<tr>\n      <td>${edu.school}</td>\n      <td>${edu.degree}</td>\n      <td>${edu.field_of_study}</td>\n    </tr>`;\n});\n\n// Return a new object that only contains the educationTable key\nreturn [{ json: { educationTable: educationRows } }];\n',
				},
				position: [900, 140],
				name: 'Education',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.perplexity',
			version: 1,
			config: {
				parameters: {
					model: 'sonar-pro',
					options: {},
					messages: {
						message: [
							{
								role: 'system',
								content:
									'=You are a researcher in a business development team. Your job is to find as much research as you can about the prospect company. You must ensure your research is for the correct company and is highly accurate. Your research must always include what the prospect company does.',
							},
							{
								content:
									"=\nFind as much info as you can about {{ $('Scrape Profiles + Posts - Relevance AI').item.json.linkedin_profile_details_data.company }}. }} This is their website URL: {{ $('Scrape Profiles + Posts - Relevance AI').item.json.linkedin_profile_details_data.company_website }}",
							},
						],
					},
					requestOptions: {},
				},
				credentials: {
					perplexityApi: { id: 'credential-id', name: 'perplexityApi Credential' },
				},
				position: [1100, 140],
				name: 'Perplexity',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'// Retrieve the JSON from the previous node\nconst input = items[0].json;\n\n// Extract the citations array; default to an empty array if not present\nconst citations = input.citations || [];\n\n// Build an HTML unordered list for the citations\nlet citationsHTML = \'<ul>\';\nif (Array.isArray(citations)) {\n  citations.forEach(citation => {\n    citationsHTML += `<li><a href="${citation}" target="_blank">${citation}</a></li>`;\n  });\n}\ncitationsHTML += \'</ul>\';\n\n// Return a new JSON object containing the generated HTML snippet\nreturn [{ json: { citationsHTML } }];\n',
				},
				position: [1300, 140],
				name: 'Citations',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'o1-mini',
						cachedResultName: 'O1-MINI',
					},
					options: {},
					messages: {
						values: [
							{
								content:
									"=You are part of the business development team at Built by Abdul which is an AI Automation Agency.\n\nWhen a new leads book a consultation with Built by Abdul, your team researches the leads and provides the research + extracted insights to the consultants so they can read it prior to the consult. \n\nYour job is to create the following sections from the research:\n\n- Personal Profile: The personal profile is a one paragraph summary of the person (lead) extracted from researching their LinkedIn profile.\n- Interests: In this section you must identify a few of the leads interests from their most recent LinkedIn posts + their LinkedIn profile. \n- Unique Facts: In this section you must extract at least 2 unique facts about the lead that tells them you've really put time to research who they are. These facts should be things that are unique to the lead and out of the ordinary.\n- Company Profile: The company profile is a one paragraph summary of the company the person represents, extracted from researching their company LinkedIn profile and available information on the web. \n\nYour output must be in HTML, following this format: \n\nPerson Profile (Heading 2)\n[Details]\n\nCompany Profile (Heading 2)\n[Details]\n\nInterests (Heading 2)\n[List of interests in dot point format]\n\nUnique Facts (Heading 2)\n[List of unique facts in dot point format]\n\n\n- Don't wrap the output in ```html``` since the output will go into the middle of another HTML document. Just make sure its in HTML language.\n\nCreate this output for the following research: \n\nLinkedIn Profile About:\n{{ $('Scrape Profiles + Posts - Relevance AI').item.json.linkedin_profile_details_data.about }}\n\nMost Recent LinkedIn Posts: \n{{ $('Scrape Profiles + Posts - Relevance AI').item.json.last_30_days_posts_transformed.toJsonString() }}\n\nWeb Research: \n{{ $('Perplexity').last().json.choices[0].message.content }}",
							},
						],
					},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [400, 560],
				name: 'Person + Company Profile',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'o1-mini',
						cachedResultName: 'O1-MINI',
					},
					options: {},
					messages: {
						values: [
							{
								content:
									"=You are part of the business development team at Built by Abdul which is an AI Automation agency that provides the following services: \n\n-AI-powered personalized lead generation systems\n-Automated ClickUp CRMs and project management workflows\n-AI Content agents that repurpose and schedule high-volume content\n-Client onboarding automations (proposals, forms, contracts, etc.)\n-Other AI workflows that save founders dozens of hours per month\n\nBuilt by Abdul's consultants are the first point of contact for a new lead. So when a new lead is interested in their solutions, they book a free call with their consultants. The consultants are then responsible for exploring the highest ROI opportunities for automation.\n\nOnce a call is booked, your team does in depth research on the lead so that the consultants can read through it in preparation for the consultation. \n\nAs part of the business development team you are provided with the following research: \n\n- LinkedIn Profile: This is the result of scraping the leads LinkedIn profile. This will give you the leads bio, experiences, education and company description.\n- LinkedIn Posts: This gives you the leads LinkedIn posts over the past 30 days. \n- Company Google Search: This gives you the research found from searching the leads company on Google and their website. \n- Reviews: This gives you the most recent bad reviews the leads company received on TrustPilot.\n\n\nYour job is to analyse the research and extract following information: \n\n- Pain Points: By looking through the companies negative reviews and also considering their line of business and the leads position in the company, you must identify the biggest pain points the leads company could be facing. \n- Solutions to Pain Points: In this section you must come up with solutions Built by Abdul can offer to solve each of the pain points completely. \n- Highest ROI Opportunities: Considering the info you have about the lead and his company, you must come up with the 5 highest ROI opportunities that Built by Abdul can offer them. These automations have to be realisitic, yet extremely high ROI. Sort them in order of best opportunity at the top of the list.  \n\nThe insights you extract must be in HTML format as they will be going in the middle of a HTML document. \n\nPlease use the following output format: \n\nOpportunities (Heading 1)\n\nPain Points and Solutions: (Heading 2)\n[Table with 3 columns: \n1. Pain Point: Explains the pain point theyre facing. \n2. Evidence: Explains why we think this is the case. \n3. Solution: Explains the solution to the pain point by Kamexa.\nEach row is a new pain point.]\n\nOpportunities: (Heading 2)\n[5 Highest ROI automation opportunities for the leads company sorted with the best solution at the top. This must be in dotpoint format:\n- Opportunity#1 Name: Details\n- Opportunity#2 Name: Details\n...\n\n- Don't wrap the output in ```html``` since the output will go into the middle of another HTML document.\n\nSomeone just booked a call. Here's the research your team found. Create the output as per the above requirements: \n\nLinkedIn Profile Scraped Summary in HTML format: \n{{ $('Person + Company Profile').last().json.message.content }}\n\nWeb Research Results for Leads Company: \n{{ $('Perplexity').last().json.choices[0].message.content }} ",
							},
						],
					},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [780, 560],
				name: 'Pain Points + Solutions',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.html',
			version: 1.2,
			config: {
				parameters: {
					html: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8">\n    <title>Consultant Research Report</title>\n    <style>\n      body {\n        font-family: Arial, sans-serif;\n        margin: 20px;\n        line-height: 1.6;\n        color: #333;\n      }\n      h1, h2, h3 {\n        color: #222;\n      }\n      .section {\n        margin-bottom: 40px;\n      }\n      .profile-details p {\n        margin: 5px 0;\n      }\n      table {\n        width: 100%;\n        border-collapse: collapse;\n        margin-top: 10px;\n      }\n      th, td {\n        border: 1px solid #ddd;\n        padding: 8px;\n        vertical-align: top;\n      }\n      th {\n        background-color: #f2f2f2;\n      }\n      .card {\n        border: 1px solid #ddd;\n        padding: 10px;\n        margin-bottom: 10px;\n        border-radius: 4px;\n      }\n      a {\n        color: #1a0dab;\n        text-decoration: none;\n      }\n      a:hover {\n        text-decoration: underline;\n      }\n      /* New styles for the header images container */\n      .header-images {\n        display: flex;\n        margin-bottom: 20px;\n      }\n      .header-images img {\n        width: 50%;\n        height: auto;\n        max-width: 300px;\n\n      }\n    </style>\n  </head>\n  <body>\n        <!-- Header Images -->\n<div class="header-images">\n  <img src="{{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.profile_image_url }}" alt="Profile Picture">\n  <img src="{{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.company_logo_url }}" alt="Company Logo">\n</div>\n\n\n    <!-- Analysis & Key Facts -->\n    <div class="section" id="analysis">\n      <h1>Analysis & Key Facts</h1>\n      {{ $(\'Person + Company Profile\').last().json.message.content }}\n      {{ $(\'Pain Points + Solutions\').last().json.message.content }}\n    </div>\n\n\n    <!-- Detailed Research Report -->\n    <div class="section" id="research-report">\n      <h1>Research Report</h1>\n      \n      <!-- LinkedIn Profile Details -->\n      <div id="linkedin-profile" class="profile-details">\n        <h2>LinkedIn Profile Details</h2>\n        <p><strong>Name:</strong> {{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.full_name }}</p>\n        <p><strong>Headline:</strong> {{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.headline }}</p>\n        <p><strong>Location:</strong> {{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.location }}</p>\n        <p><strong>About:</strong> {{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.about }}</p>\n        <p><strong>City:</strong> {{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.city }}</p>\n        <p><strong>Country:</strong> {{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.country }}</p>\n        <p><strong>Job Title:</strong> {{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.job_title }}</p>\n        <p><strong>Company:</strong> {{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.company }}</p>\n        <p><strong>Company Description:</strong> {{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.company_description }}</p>\n        <p>\n          <strong>Company Website:</strong>\n         <a href="{{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.company_website }}">\n  {{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.company_website }}\n</a>\n\n        </p>\n        <p><strong>Industry:</strong> {{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.company_industry }}</p>\n        <p>\n          <strong>LinkedIn URL:</strong>\n         <a href="{{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.linkedin_url }}">\n  {{ $(\'Scrape Profiles + Posts - Relevance AI\').item.json.linkedin_profile_details_data.linkedin_url }}\n</a>\n\n        </p>\n      </div>\n      \n      <!-- Education -->\n      <div id="education">\n        <h2>Education</h2>\n        <table>\n          <thead>\n            <tr>\n              <th>School</th>\n              <th>Degree</th>\n              <th>Field of Study</th>\n            </tr>\n          </thead>\n          <tbody>\n            {{ $node["Education"].json.educationTable }}\n          </tbody>\n        </table>\n      </div>\n      \n      <!-- Experience -->\n      <div id="experience">\n        <h2>Experience</h2>\n        <table>\n          <thead>\n            <tr>\n              <th>Company</th>\n              <th>Title</th>\n              <th>Date Range</th>\n              <th>Location</th>\n            </tr>\n          </thead>\n          <tbody>\n            {{ $node["Experiences"].json.experiencesTable }}\n          </tbody>\n        </table>\n      </div>\n      \n      <!-- Recent LinkedIn Posts -->\n      <div id="linkedin-posts">\n        <h2>Recent LinkedIn Posts</h2>\n        {{ $node["Posts"].json.postsHTML }}\n      </div>\n      \n      <!-- Google Research Analysis -->\n      <div id="google-research">\n        <h2>Google Research Analysis</h2>\n        <p>{{ $node["Perplexity"].json.choices[0].message.content.removeMarkdown().removeMarkdown() }}</p>\n      </div>\n    \n      \n      <!-- Citations -->\n      <div id="citations">\n        <h2>Citations</h2>\n        {{ $node["Citations"].json.citationsHTML }}\n      </div>\n      \n    </div>\n  </body>\n</html>\n',
				},
				position: [1220, 560],
				name: 'Create HTML Report',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: 'user@example.com',
					message: '={{ $json.html }}',
					options: { appendAttribution: false },
					subject:
						"={{ $('Scrape Profiles + Posts - Relevance AI').item.json.linkedin_profile_details_data.full_name }} Research Report",
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [1540, 560],
				name: 'Email Report',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1bSGJXsHnl6Cs9DOV9Q0iwWf_TAbgaeZdQxNSLn_kJPQ/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1bSGJXsHnl6Cs9DOV9Q0iwWf_TAbgaeZdQxNSLn_kJPQ',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1bSGJXsHnl6Cs9DOV9Q0iwWf_TAbgaeZdQxNSLn_kJPQ/edit?usp=drivesdk',
						cachedResultName: 'Content Agencies 5-20 FINAL',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-220, 280],
				name: 'Google Sheets1',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 275187821,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1REdyrlO0rJ9y7T_CQLZtLHDE7fUdPc222rzywSEzE6M/edit#gid=275187821',
						cachedResultName: 'Validated Data',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1REdyrlO0rJ9y7T_CQLZtLHDE7fUdPc222rzywSEzE6M',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1REdyrlO0rJ9y7T_CQLZtLHDE7fUdPc222rzywSEzE6M/edit?usp=drivesdk',
						cachedResultName: 'Fractional CMO FINAL',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-220, 480],
				name: 'Google Sheets2',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1248286451,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1ozF4HA8LpZVKY62B8MoxVshKKnLvUKachs8XARaLbDk/edit#gid=1248286451',
						cachedResultName: 'Data',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1ozF4HA8LpZVKY62B8MoxVshKKnLvUKachs8XARaLbDk',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1ozF4HA8LpZVKY62B8MoxVshKKnLvUKachs8XARaLbDk/edit?usp=drivesdk',
						cachedResultName: 'High ticket coaching FINAL',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-220, 660],
				name: 'Google Sheets3',
			},
		}),
	)
	.add(
		sticky('# Research Prospect\n- LinkedIn \n- Perplexity Web Research', {
			color: 6,
			position: [280, 0],
			width: 1520,
			height: 360,
		}),
	)
	.add(
		sticky('# Analysis\n- Summary \n- Pain Points + Solutions\n', {
			name: 'Sticky Note1',
			color: 6,
			position: [320, 420],
			width: 780,
			height: 360,
		}),
	)
	.add(
		sticky('# Create Report\n', {
			name: 'Sticky Note2',
			color: 6,
			position: [1140, 420],
			width: 300,
			height: 360,
		}),
	)
	.add(
		sticky('# Email Report\n', {
			name: 'Sticky Note3',
			color: 5,
			position: [1460, 420],
			width: 300,
			height: 360,
		}),
	)
	.add(
		sticky('# New Call Booked \n', {
			name: 'Sticky Note4',
			color: 5,
			position: [-580, 0],
			height: 360,
		}),
	)
	.add(
		sticky('# Find LinkedIn URL from Database\n', {
			name: 'Sticky Note5',
			color: 4,
			position: [-320, 0],
			width: 580,
			height: 840,
		}),
	)
	.add(
		sticky(
			'# Auto-generate prospect research reports after a call is booked using LinkedIn + Perplexity\n## Overview\nThis workflow auto-generates a personalized research report on any prospect who books a call with you—using their LinkedIn profile and advanced web research.\n\nWhen a call is booked in your calendar, the system looks up the lead’s LinkedIn URL from a Google Sheets database. That profile is then scraped using Relevance AI to extract posts, experiences, and education. It also runs a deep-dive query on the person using Perplexity to uncover relevant news, insights, and context. This structured data is passed to an AI model that produces a clean profile summary, suggested pain points, and solution ideas. Finally, the system builds and sends you a fully formatted HTML report via email—ready to review before your meeting.\n\n### Who’s it for\n- Founders taking high-stakes sales calls  \n- SDRs/BDRs booking back-to-back meetings  \n- Agencies and consultants who want to personalize discovery calls  \n- Teams doing high-touch enterprise sales or B2B outreach  \n\n### How it works\n- Triggered when a new call is booked via Cal.com  \n- Finds matching LinkedIn URL from a local database (Google Sheets)  \n- Scrapes public LinkedIn data via Relevance AI  \n- Runs a Perplexity query on the prospect for deeper context  \n- Formats the scraped data using Code nodes  \n- Sends structured info to AI to generate:\n  - A company + person profile  \n  - Suggested pain points and solutions  \n- Formats everything into a clean HTML report  \n- Emails you the final summary to prep for the call\n\n### Example use case\n> Someone books a call. You receive a report 2 minutes later in your inbox with:  \n> - Their role, company, and latest posts  \n> - What their business does  \n> - Recent news and context from Perplexity  \n> - Predicted pain points and how you might help  \n>  \n> You show up to the call prepped and ready\n\n### How to set up\n1. Connect your Cal.com trigger (or replace with any booking tool)  \n2. Set up your Google Sheet(s) with contact info + LinkedIn profiles  \n3. Add Relevance AI API key and configure LinkedIn scraping (they have free credits)  \n4. Link Perplexity API for web research  \n5. Customize the AI prompts and report formatting  \n6. Connect Gmail or preferred email provider to send reports\n\n### Requirements\n- Cal.com or other booking platform  \n- Google Sheets for lead storage  \n- Relevance AI account and API access  \n- Perplexity API key  \n- OpenAI or similar LLM for summarization  \n- Email integration (e.g. Gmail)\n\n### How to customize\n- Replace Cal.com with Calendly, SavvyCal, etc.  \n- Change AI prompt tone and structure of the report  \n- Add CRM push (e.g. log into HubSpot, Notion, or Airtable)  \n- Add Slack or Telegram notifications for call alerts  \n- Format reports as PDF instead of HTML for download\n',
			{ name: 'Sticky Note6', position: [-1280, 0], width: 660, height: 1560 },
		),
	)
	.add(
		sticky(
			"## Hey, I'm Abdul 👋\n### I build growth systems for consultants & agencies. If you want to work together or need help automating your business, check out my website: \n### **https://www.builtbyabdul.com/**\n### Or email me at **abdul@buildabdul.com**\n### Have a lovely day ;)`",
			{ name: 'Sticky Note7', color: 5, position: [-1060, -300], width: 440, height: 240 },
		),
	)
	.add(
		sticky('## Example Output\n![](https://i.imgur.com/q3pN5im.png)', {
			name: 'Sticky Note8',
			color: 5,
			position: [-580, -640],
			width: 840,
			height: 580,
		}),
	)
	.add(
		sticky('## Continued...\n![](https://i.imgur.com/tcpVfxV.png)', {
			name: 'Sticky Note9',
			color: 5,
			position: [280, -640],
			width: 840,
			height: 580,
		}),
	)
	.add(
		sticky('## Continued\n![](https://i.imgur.com/Jaaxdt2.png)', {
			name: 'Sticky Note10',
			color: 5,
			position: [1140, -640],
			width: 840,
			height: 580,
		}),
	);
