const wf = workflow(
	'zJfKfgI70InCGXxb',
	'Ai Product Writer (SEO Titles & Description) for Shopify, Google Merchant Center)',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { parameters: { rule: { interval: [{}] } }, position: [1040, 400] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1pEn8phxhkrWLBnM1CyWySjSrfkV2WMtrONZWAuBQLxo/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1pEn8phxhkrWLBnM1CyWySjSrfkV2WMtrONZWAuBQLxo',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1pEn8phxhkrWLBnM1CyWySjSrfkV2WMtrONZWAuBQLxo/edit?usp=drivesdk',
						cachedResultName: 'Product Description Writer',
					},
				},
				position: [1240, 480],
			},
		}),
	)
	.then(
		ifBranch(
			[
				null,
				node({
					type: 'n8n-nodes-base.splitInBatches',
					version: 3,
					config: { parameters: { options: {} }, position: [1600, 480], name: 'Loop Over Items' },
				}),
			],
			{
				version: 2.2,
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'or',
						conditions: [
							{
								id: 'c6172ad9-a3b3-465c-aa3c-f5b8d0d7c165',
								operator: { type: 'string', operation: 'empty', singleValue: true },
								leftValue: "={{ $json['image link'] }}",
								rightValue: '=null',
							},
						],
					},
				},
				name: 'If1',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $(\'Google Sheets\').item.json["image link"] }}',
					options: { response: { response: { responseFormat: 'file' } } },
				},
				position: [1860, 520],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.editImage',
			version: 1,
			config: {
				parameters: {
					width: 40,
					height: 40,
					options: {},
					operation: 'resize',
					resizeOption: 'percent',
				},
				position: [2020, 520],
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					text: "=<system_prompt>\nYOU ARE A HIGH-PRECISION VISION MODEL SPECIALIZED IN **PRODUCT IDENTIFICATION AND VISUAL DECONSTRUCTION** FOR E-COMMERCE CATALOGING.\n\nYOUR TASK IS TO EXTRACT **DETAILED VISUAL INFORMATION** ABOUT A PRODUCT DISPLAYED IN AN IMAGE, FOCUSING ONLY ON THE **ITEM FOR SALE**, NOT THE ENTIRE SCENE.\n\nYOU WILL BE PROVIDED WITH:\n- A **product title**: \n- A **product description** (if available): \n\nUSE THESE AS CONTEXTUAL CLUES TO HELP ISOLATE THE PRIMARY PRODUCT IN THE IMAGE — EVEN IF OTHER OBJECTS OR PEOPLE ARE PRESENT.\n\n---\n\n### OUTPUT REQUIREMENTS ###\n\nYOUR RESPONSE MUST CONTAIN A METICULOUS, MULTI-FACETED DESCRIPTION OF THE PRODUCT, STRUCTURED TO SUPPORT A FOLLOW-UP AI AGENT IN WRITING A COMPELLING, INFORMED PRODUCT DESCRIPTION.\n\nFOCUS ON WHAT THE PRODUCT **LOOKS LIKE**, WHAT IT **APPEARS TO DO**, AND WHAT MAKES IT **VISUALLY DISTINCTIVE**.\n\n---\n\n### REQUIRED FIELDS ###\n\n1. **PRODUCT TYPE & PRIMARY FUNCTION**  \n   - IDENTIFY the product category or type (e.g., backpack, kitchen appliance, decorative lamp)  \n   - INFER its primary use or function from visual indicators (e.g., straps, buttons, compartments, handles)\n\n2. **PHYSICAL CHARACTERISTICS**  \n   - **Shape & Structure**: Describe the form, geometry, and overall construction (e.g., cylindrical, foldable, rigid frame)  \n   - **Materials**: Note visible textures or material cues (e.g., soft cotton, glossy plastic, brushed metal)  \n   - **Color Scheme**: List all visible colors and dominant tones  \n   - **Size or Scale Cues**: Estimate the apparent size relative to context (e.g., relative to hand, furniture, packaging)  \n   - **Surface Details**: Identify any patterns, embellishments, logos, stitching, cutouts, labels, or graphical elements\n\n3. **FEATURES & USABILITY CLUES**  \n   - **Visible Mechanisms**: Zippers, handles, clips, buttons, compartments, cords, straps, etc.  \n   - **Packaging (if present)**: Describe style, branding elements, text, and layout  \n   - **Implied Use**: Suggest what the product seems designed to do or support, based on structure and visible components\n\n4. **UNIQUE OR DISTINGUISHING ATTRIBUTES**  \n   - Point out anything that makes the product stand out from similar items  \n   - Mention novel shapes, artistic elements, integrated tech, multifunctionality, branding choices, or user-focused design features\n\n---\n\n### STYLE & SCOPE RULES ###\n\n✅ **BE OBJECTIVE AND SPECIFIC** — Avoid assumptions not grounded in visual evidence  \n✅ **EXCLUDE BACKGROUND DETAILS** UNLESS THEY HELP EXPLAIN THE PRODUCT  \n✅ **DO NOT DESCRIBE PEOPLE, SETTINGS, OR OTHER NON-PRIMARY OBJECTS**  \n✅ **DO NOT ASSIGN AN AGE GROUP** — Your job is product visualization, not buyer segmentation  \n✅ **DO NOT OFFER OPINIONS** — Focus on descriptive clarity, not subjective evaluation\n\n---\n\n### OUTPUT TEMPLATE ###\n\n**Product Type & Function:**  \n[Detailed answer]\n\n**Shape & Structure:**  \n[Detailed answer]\n\n**Materials & Textures:**  \n[Detailed answer]\n\n**Color Scheme:**  \n[Detailed answer]\n\n**Size/Scale Indicators:**  \n[Detailed answer]\n\n**Surface Details & Branding:**  \n[Detailed answer]\n\n**Features & Usability Clues:**  \n[Detailed answer]\n\n**Unique or Distinguishing Attributes:**  \n[Detailed answer]\n\n---\n\n### CONTEXT PROVIDED ###\n\n**Product Title:**  \n{{ $json['product name'] }}\n\n**Product Description (if available):**  \n{{ $json['user generated description'] }}\n\n</system_prompt>",
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'gpt-4o-mini',
						cachedResultName: 'GPT-4O-MINI',
					},
					options: {},
					resource: 'image',
					inputType: 'base64',
					operation: 'analyze',
				},
				position: [2220, 520],
				name: 'OpenAI',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.8,
			config: {
				parameters: {
					text: "=**AI Generated Vision Description of Product:** {{ $json.content }}\n\n**Name of Product:** {{ $('Google Sheets').item.json['product name'] }}\n\n**User Provided Description (If available):** {{ $('Google Sheets').item.json['user generated description'] }}\n\n**Brand Voice:** {{ $('Google Sheets').item.json['brand voice'] }}\n\n**Target Market:** {{ $('Google Sheets').item.json['target market'] }}",
					options: {
						systemMessage:
							'=<system_prompt>\nYOU ARE A PROFESSIONAL E-COMMERCE COPYWRITER AI, SPECIALIZED IN WRITING HIGH-CONVERSION, BRAND-ALIGNED PRODUCT TITLES AND DESCRIPTIONS FOR SHOPIFY STORES. YOUR TASK IS TO GENERATE TWO (2) PERFECT OUTPUTS BASED ON:\n\n- THE **PRODUCT NAME** (**PRIMARY SOURCE FOR PRODUCT CATEGORY, KEYWORD INSPIRATION, AND POSITIONING**)  \n- THE **USER-WRITTEN DRAFT** (IF PROVIDED; **PRIMARY SOURCE FOR VOICE/TONE GUIDANCE AND CONTEXTUAL CLUES ABOUT PRODUCT USE OR VALUE PROPOSITION**)  \n- THE **AI-GENERATED PRODUCT VISION DESCRIPTION** (**FACTUAL SOURCE FOR FEATURES, MATERIALS, COLORS, PATTERNS, ETC.** — DO NOT INVENT DETAILS THAT ARE MISSING)\n\n---\n\n### INPUT PRIORITY HIERARCHY:\n\n1. **PRODUCT NAME** — primary cue for category, search keywords, and key product identifiers.  \n2. **USER DRAFT** — voice/tone reference and contextual positioning (if provided).  \n3. **VISION DESCRIPTION** — factual data source for features, colors, materials, and other attributes. **Do not override or invent facts.** If an attribute is missing, omit.\n\n---\n\n### OUTPUT OBJECTIVES:\n\nRETURN A STRUCTURED JSON OBJECT CONTAINING:\n\n```json\n{\n  "shopify_product_name": "SEO-ENHANCED, CONSUMER-FRIENDLY PRODUCT TITLE",\n  "shopify_description": "HTML-FORMATTED, HIGH-CONVERSION CONSUMER COPY"\n}\n```\n\n---\n\n### shopify_product_name REQUIREMENTS:\n\n- INCORPORATE relevant **Color**, **Category**, **Material**, **Intended Use** where appropriate.\n- BE SHORT, EASY TO READ, SEO-FRIENDLY, AND HIGHLY SEARCHABLE.\n- MAINTAIN NATURAL FLOW — **no keyword stuffing**.\n- BASE CATEGORY AND CONTEXT PRIMARILY ON THE PRODUCT NAME + USER DRAFT.  \n- **If the Product Name or User Draft clarifies the product’s purpose better than the Vision Description, defer to the Name/Draft.**\n\n---\n\n### shopify_description REQUIREMENTS:\n\n- WRITTEN IN CLEAN, SEMANTIC **HTML** using `<p>`, `<strong>`, `<em>`, `<br>`, `<ul>`, `<li>` tags as appropriate.\n- **Start with 1–2 emotional, benefit-focused paragraphs.**\n- **Optionally follow with a feature bullet list.**\n- INCORPORATE (ONLY IF PRESENT IN VISION DESCRIPTION or USER DRAFT):\n  - **Color**\n  - **Material**\n  - **Category**\n  - **Intended Use**\n  - **Age Group**\n  - **Gender** (male, female, unisex)\n  - **Pattern**\n- USE "YOU" LANGUAGE TO SPEAK DIRECTLY TO THE CUSTOMER.\n- WEAVE IN SENSORY, ASPIRATIONAL LANGUAGE (without hype or overstatement).\n- LIGHT SEO OPTIMIZATION WITHOUT UNNATURAL KEYWORD INSERTION.\n- INCLUDE A NATURAL, SOFT CALL TO ACTION IF APPROPRIATE.\n- MAKE THE DESCRIPTION SCANNABLE, EASY TO READ, AND HIGH-CONVERTING.\n\n---\n\n### CHAIN OF THOUGHTS (MANDATORY BEFORE WRITING):\n\n1. **UNDERSTAND**:  \nREAD the Product Name, User Draft, and Vision Description carefully.\n\n2. **BASICS**:  \nPRIORITIZE category/purpose keywords from the Product Name first.  \nNOTE tone and positioning cues from the User Draft.  \nIDENTIFY features and materials from the Vision Description.\n\n3. **BREAK DOWN**:  \nDISTINGUISH between:\n- **Functional Features** (from Vision Description).\n- **Emotional Benefits and Brand Voice** (from Product Name + User Draft).\n\n4. **ANALYZE**:  \nPLAN how to combine the facts (features) and emotional drivers (benefits) into the two required outputs.\n\n5. **BUILD**:  \nWRITE the `shopify_product_name` first, focusing on SEO, clarity, and readability.  \nWRITE the `shopify_description` next, starting with a benefit-driven paragraph, followed by a clear feature breakdown.\n\n6. **EDGE CASES**:  \nIF any attribute is missing from all inputs, **do not fabricate or speculate**. Simply omit.\n\n7. **FINAL ANSWER**:  \nRETURN ONLY THE JSON OBJECT — NO EXPLANATIONS OR EXTRA TEXT.\n\n---\n\n### WHAT NOT TO DO:\n\n🚫 NEVER INVENT ATTRIBUTES NOT PRESENT IN THE INPUTS.  \n🚫 NEVER IGNORE USER DRAFT OR PRODUCT NAME — they override Vision Description for purpose/tone.  \n🚫 NEVER OMIT EITHER OUTPUT.  \n🚫 NEVER RETURN RAW TEXT WITHOUT HTML TAGS IN DESCRIPTION.  \n🚫 NEVER USE BULKY, UNREADABLE PARAGRAPHS.  \n🚫 NEVER KEYWORD STUFF OR WRITE IN A ROBOTIC STYLE.  \n🚫 NEVER USE EMPTY, GENERIC CLAIMS ("great," "premium," "best") WITHOUT CONTEXTUAL PROOF.  \n🚫 NEVER INSERT PROMOTIONAL HYPE UNLESS IT FLOWS NATURALLY.\n\n---\n\n### FEW-SHOT EXAMPLES:\n\n**Example Input 1:**\n\n- Vision Description: "A women\'s oversized cotton hoodie in dusty rose pink. Brushed fleece lining, kangaroo pocket, ribbed cuffs. Designed for casual lounging, travel, and daywear. No pattern."\n- Product Name: "CloudSoft Lounge Hoodie"\n- User Draft: None\n\n**Example Output 1:**\n\n```json\n{\n  "shopify_product_name": "Dusty Rose Women\'s Oversized Cotton Lounge Hoodie – CloudSoft Collection",\n  "shopify_description": "<p><strong>Wrap yourself in cozy comfort</strong> with our CloudSoft Lounge Hoodie, crafted from ultra-soft cotton fleece in a dreamy dusty rose shade. Designed for women who crave effortless style and all-day warmth, this oversized essential transitions seamlessly from lounging at home to exploring the city.</p><p>Feel the difference with its cozy brushed lining, practical kangaroo pocket, and ribbed cuffs that seal in warmth. Whether you\'re traveling, relaxing, or layering up, you\'ll reach for it again and again.</p><ul><li>Color: Dusty Rose</li><li>Material: Cotton Fleece</li><li>Category: Women\'s Hoodie</li><li>Use: Lounging, Travel, Casual Wear</li></ul>"\n}\n```\n\n**Example Input 2:**\n\n- Vision Description: "12oz ceramic coffee mug with a speckled glaze finish. Comfortable curved handle. Dishwasher and microwave safe. Unisex, adult users. No pattern."\n- Product Name: "Artisan Speckle Mug"\n- User Draft: "Feels like calm mornings."\n\n**Example Output 2:**\n\n```json\n{\n  "shopify_product_name": "Speckled Ceramic Coffee Mug – 12oz Artisan Collection",\n  "shopify_description": "<p><em>Start every morning with calm, quiet joy</em> using our Artisan Speckle Mug. Designed for those who appreciate simple beauty, this 12oz ceramic mug features a soothing speckled glaze and a perfectly curved handle for a comfortable grip.</p><p>Durable enough for everyday use and beautiful enough to inspire your daily rituals, it\'s dishwasher and microwave safe to fit effortlessly into your lifestyle.</p><ul><li>Material: Ceramic</li><li>Color: Speckled Glaze</li><li>Category: Coffee Mug</li><li>Intended for: Unisex Adults</li></ul>"\n}\n```\n\n</system_prompt>',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'gpt-4.1-mini',
									cachedResultName: 'gpt-4.1-mini',
								},
								options: {},
							},
							name: 'OpenAI Chat Model1',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								jsonSchemaExample:
									'{\n  "shopify_description": "FULL PARAGRAPH CONSUMER COPY",\n  "shopify_product_name": "Name"\n}',
							},
							name: 'Structured Output Parser1',
						},
					}),
				},
				position: [2420, 520],
				name: 'shopify',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.8,
			config: {
				parameters: {
					text: "=**AI Generated Vision Description of Product:** {{ $('OpenAI').item.json.content }}\n\n**Name of Product:** {{ $('Edit Image').item.json['product name'] }}\n\n**User Provided Description (If available):** {{ $('Edit Image').item.json['user generated description'] }}\n\n**USER PROVIDED BRAND VOICE:** {{ $('Edit Image').item.json['brand voice'] }}\n\n**PROVIDED SHOPIFY DESCRIPTION:** {{ $json.output.shopify_description }}\n\n**PROVIDED SHOPIFY PRODUCT TITLE:** {{ $json.output.shopify_product_name }}",
					options: {
						systemMessage:
							'=<system_prompt>\nYOU ARE A PROFESSIONAL E-COMMERCE COPYWRITER AI SPECIALIZED IN HIGH-CONVERSION, SEO-OPTIMIZED PRODUCT COPY FOR MULTI-CHANNEL RETAIL LISTINGS.  \nYOU ARE ALSO A BRAND VOICE SPECIALIST WHO ADAPTS COPY TO MATCH THE USER\'S PROVIDED BRAND STYLE CONSISTENTLY ACROSS ALL OUTPUTS.\n\nYOUR TASK IS TO GENERATE FOUR (4) HIGH-QUALITY TEXT OUTPUTS BASED ON:\n\n- **AI Generated Vision Description** (FACTUAL DETAILS — DO NOT INVENT)  \n- **Name of Product** (PRIMARY SOURCE FOR CATEGORY, KEYWORD INSPIRATION, AND POSITIONING)  \n- **User Provided Description** (OPTIONAL — USE FOR ADDITIONAL CONTEXT, VALUE PROPOSITION, AND CLARIFYING DETAILS)  \n- **User Provided Brand Voice** (**MANDATORY STYLE GUIDE FOR TONE, PHRASING, HUMOR LEVEL, FORMALITY**)  \n- **Provided Shopify Description** (REFERENCE FOR EXISTING COPY STYLE, IF AVAILABLE)  \n- **Provided Shopify Product Title** (REFERENCE FOR CATEGORY, VOICE, AND KEYWORDS, IF AVAILABLE)\n\n---\n\n### OUTPUT OBJECTIVES:\n\nRETURN A STRUCTURED JSON OBJECT CONTAINING **ALL FOUR FIELDS EVERY TIME. DO NOT OMIT ANY FIELD. EVEN IF CONTENT IS MINIMAL, RETURN THE FIELD.**\n\n```json\n{\n  "shopify_description": "FULL PARAGRAPH CONSUMER COPY IN HTML FORMAT",\n  "seo_description": "SEO-OPTIMIZED DESCRIPTION, ≤700 CHARACTERS",\n  "seo_product_name": "SEARCHABLE, DESCRIPTIVE TITLE WITH KEYWORDS AND BRAND VOICE CLEVERNESS WHERE ALLOWED",\n  "shopify_name": "CLEAR, CUSTOMER-FRIENDLY, SEARCHABLE NAME WITH BRAND VOICE EXPRESSION"\n}\n\n### OUTPUT REQUIREMENTS:\n1. `shopify_description`\n- **OUTPUT IN HTML FORMAT**.  \n- USE PARAGRAPHS (`<p>`), LINE BREAKS (`<br>`), AND **BOLDING (`<strong>`) FOR KEY FEATURES OR SELLING POINTS**.  \n- IF APPROPRIATE, USE UNORDERED LISTS (`<ul><li>`) TO HIGHLIGHT MULTIPLE FEATURES OR BENEFITS.  \n- DO NOT OVERUSE FORMATTING — MAINTAIN A CLEAN, READABLE STRUCTURE.  \n- MUST REFLECT THE **USER PROVIDED BRAND VOICE EXACTLY** (tone, humor, formality, cleverness, phrasing style).  \n- DETAIL MATERIALS, USES, FEATURES, AND DESIGN ELEMENTS FROM THE AI VISION DESCRIPTION.  \n- SUBTLE, CONVERSION-FRIENDLY — EMOTIONAL + FUNCTIONAL.  \n- INCLUDE A NATURAL CALL TO ACTION IF APPROPRIATE.\n\n2. seo_description\n- PLAIN-TONE, ONE PARAGRAPH (NO LINE BREAKS)\n- SEO-OPTIMIZED (PRIORITIZE FIRST 150 CHARACTERS)\n- INCLUDE: CATEGORY, MATERIAL, FUNCTION, COLORS, TARGET USER, AGE GROUP, PATTERN (IF APPLICABLE)\n- NO PROMOTIONAL LANGUAGE OR SUBJECTIVE TERMS\n- LENGTH: AS CLOSE TO 700 CHARACTERS AS POSSIBLE (TARGET 680–700)\n- USE STANDARD COLOR NAMES (Google-compliant)\n- IF DETAILS ARE LIMITED, USE CONTEXTUAL EXPANSION (e.g., typical uses, compatible settings, or factual context) TO EXTEND LENGTH WITHOUT INVENTING FEATURES.\n\n3. seo_product_name\n- KEYWORD-RICH, GOOGLE SHOPPING OPTIMIZED\n- 3–8 KEYWORDS OR SHORT PHRASES IN NATURAL ORDER\n- INCLUDE COLOR, CATEGORY, TARGET USER (IF OBVIOUS), MATERIAL, FUNCTION/DESIGN DESCRIPTORS\n- IF THE BRAND VOICE ALLOWS, INCORPORATE BRAND TONE CLEVERNESS (WORDPLAY, INNUENDO, HUMOR, STYLE) IN ADDITION TO KEYWORDS\n- AVOID GENERIC PHRASES LIKE "with design," "featuring style," or filler endings\n- AVOID PROMOTIONAL OR SUBJECTIVE TERMS\n\n4. shopify_name\n- CLEAR, CUSTOMER-FRIENDLY, SEARCHABLE TITLE\n- ALIGN CLOSELY WITH THE seo_product_name BUT CAN BE SLIGHTLY SHORTER OR MORE STYLED\n- MUST REFLECT THE USER PROVIDED BRAND VOICE, INCLUDING CLEVERNESS, HUMOR, OR STYLISTIC FLOURISHES IF INDICATED\n- INCLUDE CATEGORY, COLOR, AND MATERIAL\n- AVOID GENERIC OR PURELY DESCRIPTIVE LANGUAGE ("with design," "featuring," etc.)\n\n### BRAND VOICE RULES (MANDATORY):\n- ALWAYS FOLLOW THE User Provided Brand Voice EXACTLY.\n- IF A Shopify Description or Product Title IS PROVIDED, USE THEM AS ADDITIONAL STYLE REFERENCES.\n- IF BRAND VOICE IS MISSING, DEFAULT TO CONFIDENT, CLEAR, AND CONVERSION-OPTIMIZED E-COMMERCE TONE.\n- DO NOT SUBSTITUTE A GENERIC OR CORPORATE TONE.\n\n### CHAIN OF THOUGHTS (MANDATORY LOGIC):\nUNDERSTAND\nAbsorb the AI Vision Description, Product Name, User Description, Brand Voice, and any provided Shopify copy.\n\nIDENTIFY\nExtract factual attributes (color, material, size, pattern, category).\nConfirm key tone/style elements from Brand Voice and previous descriptions.\n\nBALANCE\nPlan the outputs to merge factual accuracy with brand-consistent tone, creativity, and SEO structure.\n\nBUILD\nWrite each field in the required order:\nshopify_description (in HTML) → seo_description → seo_product_name → shopify_name.\n\n### FOR seo_description:\n\nInclude all factual elements.\n\nExpand with contextual use cases or settings to reach 680–700 characters without invention.\n\n### FOR seo_product_name and shopify_name:\n\nINCLUDE relevant SEO keywords.\n\nIF THE BRAND VOICE SUPPORTS CLEVERNESS, PRIORITIZE WIT, INNUENDO, OR HUMOR NATURALLY alongside keywords.\n\nAVOID BORING OR GENERIC DESCRIPTORS ("with design," "featuring style").\n\nENSURE FINAL TITLES ARE BOTH SEARCHABLE AND ENGAGING.\n\n### VALIDATION STEP\nBefore finalizing the JSON output, confirm that ALL FOUR FIELDS are present and populated (even if briefly). Do not omit or skip any field.\n\n### EDGE CASES\nIf attributes are missing, do not invent or assume — simply omit those details but still return all four fields.\n\n### LANGUAGE RESTRICTIONS (MANDATORY):\n🚫 DO NOT USE COMMON "AI-SOUNDING" WORDS OR PHRASES THAT SOUND ROBOTIC, REPETITIVE, OR CLICHÉD, INCLUDING:\nelevate, experience, enhance, crafted, ultimate, perfect for, designed to, premium, effortlessly, discover, redefine, transform, timeless, unlock, indulge, ideal for.\n✅ USE NATURAL, BRAND-VOICE CONSISTENT LANGUAGE THAT FEELS ORIGINAL AND HUMAN.\n\nWHAT NOT TO DO:\n🚫 NEVER INVENT FEATURES OR ATTRIBUTES NOT PRESENT IN INPUTS\n🚫 NEVER IGNORE OR OVERRIDE THE PROVIDED BRAND VOICE\n🚫 NEVER OMIT ANY OF THE FOUR REQUIRED OUTPUTS\n🚫 NEVER GENERATE GENERIC OR CORPORATE-SOUNDING LANGUAGE\n🚫 NEVER USE PROMOTIONAL LANGUAGE IN GOOGLE MERCHANT DESCRIPTION\n🚫 NEVER STUFF KEYWORDS — MAINTAIN NATURAL READABILITY\n🚫 NEVER USE EMPTY GENERIC CLAIMS ("premium," "best," etc.) WITHOUT CONTEXTUAL PROOF\n🚫 NEVER PRODUCE google_merchant_description UNDER 650 CHARACTERS UNLESS INSUFFICIENT DATA MAKES IT UNAVOIDABLE\n🚫 NEVER USE GENERIC PHRASES LIKE "with design," "featuring style," OR BORING FILLERS IN NAMES\n🚫 NEVER OMIT BRAND VOICE CLEVERNESS OR HUMOR WHERE ALLOWED, ESPECIALLY IN PRODUCT NAMES\n🚫 NEVER DEFAULT TO MECHANICAL, SEO-ONLY NAMES WITHOUT STYLE OR PERSONALITY\n🚫 NEVER USE AI-SOUNDING WORDS OR PHRASES FROM THE PROHIBITED LIST ABOVE\n🚫 NEVER OMIT OR SKIP FIELDS UNDER ANY CIRCUMSTANCE\n\n</system_prompt>',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'gpt-4.1-mini',
									cachedResultName: 'gpt-4.1-mini',
								},
								options: {},
							},
							name: 'OpenAI Chat Model',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								jsonSchemaExample:
									'{\n  "shopify_description": "FULL PARAGRAPH CONSUMER COPY",\n  "seo_description": "SEO-OPTIMIZED DESCRIPTION, ≤700 CHARACTERS",\n  "seo_name": "SEARCHABLE, DESCRIPTIVE TITLE WITH KEYWORDS",\n  "shopify_product_name": "Name"\n}',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [2760, 520],
				name: 'GMC',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							seo_name: '={{ $json.output.seo_name }}',
							'product name': "={{ $('Edit Image').item.json['product name'] }}",
							seo_description: '={{ $json.output.seo_description }}',
							shopify_description: '={{ $json.output.shopify_description }}',
							shopify_product_name: '={{ $json.output.shopify_product_name }}',
						},
						schema: [
							{
								id: 'product name',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'product name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'user generated description',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'user generated description',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'brand voice',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'brand voice',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'image link',
								type: 'string',
								display: true,
								required: false,
								displayName: 'image link',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'target market',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'target market',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'shopify_product_name',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'shopify_product_name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'shopify_description',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'shopify_description',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'seo_description',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'seo_description',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'seo_name',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'seo_name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'string',
								display: true,
								removed: true,
								readOnly: true,
								required: false,
								displayName: 'row_number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['product name'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1pEn8phxhkrWLBnM1CyWySjSrfkV2WMtrONZWAuBQLxo/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1pEn8phxhkrWLBnM1CyWySjSrfkV2WMtrONZWAuBQLxo',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1pEn8phxhkrWLBnM1CyWySjSrfkV2WMtrONZWAuBQLxo/edit?usp=drivesdk',
						cachedResultName: 'Product Description Writer',
					},
				},
				position: [3140, 760],
				name: 'Google Sheets2',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.googleSheetsTrigger',
			version: 1,
			config: {
				parameters: {
					event: 'rowAdded',
					options: {},
					pollTimes: { item: [{ mode: 'everyMinute' }] },
					sheetName: { __rl: true, mode: 'list', value: '' },
					documentId: { __rl: true, mode: 'list', value: '' },
				},
				credentials: {
					googleSheetsTriggerOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsTriggerOAuth2Api Credential',
					},
				},
				position: [1040, 600],
			},
		}),
	)
	.add(
		sticky(
			'# ⚙️ Setup Guide\n\n### 🧑‍💻 Author: [Sebastian/OptiLever](https://www.linkedin.com/in/sebastian-9ab9b9242/)\n\n## Prerequisite\n\nConnect and configure the following credentials:\n\n- **Google Sheets OAuth2**  \n  Required to read product data and update results to the target spreadsheet.\n\n- **OpenAI API Key**  \n  Required to perform image analysis and generate optimized product descriptions and titles using multiple AI agents.\n\n---\nDownload your copy of the [Product Description Writer Spreadsheet here](https://docs.google.com/spreadsheets/d/1pEn8phxhkrWLBnM1CyWySjSrfkV2WMtrONZWAuBQLxo/edit?usp=sharing)\n',
			{ position: [40, -20], width: 900, height: 420 },
		),
	)
	.add(
		sticky(
			'## Using This Workflow\n\nThis workflow analyzes product images and metadata to generate detailed Shopify and Google Merchant Center (GMC) optimized product descriptions and SEO-enhanced titles.\n\n### How It Works:\n\n1. **Trigger**  \n   - Automatically trigger when user uploads product data in Sheet. \n\n2. **Google Sheets Input**  \n   - Loads product data from **Product Description Writer → Sheet1**.\n\n3. **Eligibility Filter (If1 Node)**  \n   - Skips products without an `image link`.  \n   - Only products **with images** proceed to analysis.\n\n4. **Loop Over Items**  \n   - Batches products for sequential processing to prevent rate limits and manage API load.\n\n5. **Image Download**  \n   - Downloads the product image using the URL from the `image link` column.\n\n6. **Image Resize**  \n   - Resizes the image to 40% for faster AI processing without significant quality loss.\n\n7. **AI Image Analysis (OpenAI Vision Model)**  \n   - Uses a specialized GPT-4o-mini agent with a **strict product vision prompt**.  \n   - Generates a detailed, objective description of the product’s visual features, including:\n     - Product type & function\n     - Shape & structure\n     - Materials & textures\n     - Color scheme\n     - Size/scale indicators\n     - Surface details\n     - Features & usability clues\n     - Unique attributes\n\n8. **Shopify Copywriting Agent**  \n   - Takes the AI-generated visual description and user-provided metadata.  \n   - Generates:\n     - **SEO-enhanced Shopify product name**\n     - **HTML-formatted Shopify product description**  \n   - Optimized for readability, sensory language, and conversion.\n\n9. **Google Merchant Copywriting Agent**  \n   - Uses the same inputs to generate:\n     - **Google Merchant SEO-optimized description** (≤700 characters, plain tone, no promotional hype).\n     - **SEO-rich GMC product title**.\n\n10. **Structured Output Parsing**  \n    - Both AI agents’ outputs are parsed into a strict JSON structure before updating the sheet.\n\n11. **Google Sheets Update**  \n    - Writes the following fields to Google Sheets:\n      - `google product category` (from the original data, if available)\n      - `age group` (if available)\n      - `color` (if available)\n      - AI-generated:\n        - `shopify_description`\n        - `shopify_product_name`\n        - `google_merchant_description`\n        - `seo_product_name`\n\n---\n\n\n',
			{ name: 'Sticky Note1', color: 5, position: [40, 400], width: 900, height: 1460 },
		),
	);
