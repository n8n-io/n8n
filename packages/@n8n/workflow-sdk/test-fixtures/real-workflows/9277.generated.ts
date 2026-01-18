const wf = workflow('', '')
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.3,
			config: {
				parameters: { options: {} },
				position: [-2544, -1472],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					options: {
						systemMessage:
							'=Google Classroom Master Agent\nAct as an orchestrator that routes requests to the correct sub-agent and tool below. Validate required inputs before invoking any tool. Authorization and JSON handling are managed by the tools. Only call tools listed here.\n\nCoursework Management Agent\n\nList coursework: Inputs: courseId. Returns: array of CourseWork resources.\n\nGet coursework: Inputs: courseId, courseWorkId. Returns: a CourseWork resource.\n\nGet coursework add-on context: Inputs: courseId, courseWorkId. Returns: AddOnContext for the coursework.\n\nCourse Management Agent\n\nList courses: Inputs: none. Returns: array of Course resources.\n\nGet course: Inputs: courseId. Returns: Course resource.\n\nGet grading period settings: Inputs: courseId. Returns: GradingPeriodSettings resource.\n\nAnnouncements Agent\n\nList announcements: Inputs: courseId. Returns: array of Announcement resources.\n\nGet announcement: Inputs: courseId, announcementId. Returns: the specified Announcement resource.\n\nCreate announcement: Inputs: courseId, JSON body with Announcement fields. Returns: newly created Announcement resource.\n\nPatch announcement: Inputs: courseId, announcementId, updateMask, JSON body with updated values. Returns: updated Announcement resource.\n\nDelete announcement: Inputs: courseId, announcementId. Returns: empty response on success.\n\nGet announcement add-on context: Inputs: courseId, announcementId. Returns: AddOnContext for the announcement.\n\nCourse Post Agent\n\nGet post add-on context: Inputs: postId. Returns: AddOnContext for the post.\n\nList post add-on attachments: Inputs: postId. Returns: array of AddOnAttachment resources.\n\nGet post add-on attachment: Inputs: postId, attachmentId. Returns: specified AddOnAttachment resource.\n\nGet post attachment submission: Inputs: postId, attachmentId, submissionId. Returns: StudentSubmission resource for the attachment.\n\nStudents Agent\n\nList students: Inputs: courseId. Returns: array of Student resources.\n\nGet student: Inputs: courseId, studentId. Returns: specified Student resource.\n\nTeacher Agent\n\nList teachers: Inputs: courseId. Returns: array of Teacher resources.\n\nGet teacher: Inputs: courseId, teacherId. Returns: specified Teacher resource.\n\nCreate teacher: Inputs: courseId, JSON body with Teacher fields. Returns: newly created Teacher resource.\n\nDelete teacher: Inputs: courseId, teacherId. Returns: empty response on success.\n\nCourse Topic Agent\n\nList topics: Inputs: courseId. Returns: array of Topic resources.\n\nGet topic: Inputs: courseId, topicId. Returns: specified Topic resource.\n\nCreate topic: Inputs: courseId, JSON body with Topic fields. Returns: newly created Topic resource.\n\nPatch topic: Inputs: courseId, topicId, updateMask, JSON body with updated fields. Returns: updated Topic resource.\n\nDelete topic: Inputs: courseId, topicId. Returns: empty response on success.',
					},
				},
				position: [-1584, -1472],
				name: 'Google Classroom Ultimate Agent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url', 'List topics for a course.', 'string', 'https://classroom.googleapis.com/v1/courses/{courseId}/topics') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-3008, -352],
				name: 'List topics',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agentTool',
			version: 2.2,
			config: {
				parameters: {
					text: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Prompt__User_Message_', ``, 'string') }}",
					options: {
						systemMessage:
							'You are Course_Topic_Agent, an AI assistant specialized in managing Google Classroom topics via the Classroom REST v1 API. Invoke the correct tool to handle each request:\n\nList topics\n– Inputs: courseId\n– Returns: an array of Topic resources\n\nGet topic\n– Inputs: courseId, topicId\n– Returns: the specified Topic resource\n\nCreate topic\n– Inputs: courseId, JSON body with Topic fields (name, topicId)\n– Returns: the newly created Topic resource\n\nPatch topic\n– Inputs: courseId, topicId, updateMask specifying which fields to update, JSON body with updated fields (e.g., name)\n– Returns: the updated Topic resource\n\nDelete topic\n– Inputs: courseId, topicId\n– Returns: empty response on success',
					},
				},
				position: [-2768, -688],
				name: 'Course  Topic Agent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url', 'Get a specific topic.', 'string', 'https://classroom.googleapis.com/v1/courses/{courseId}/topics/{topicId}') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-2880, -336],
				name: 'Get topic',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url', 'Create a new topic.', 'string', 'https://classroom.googleapis.com/v1/courses/{courseId}/topics') }}",
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Name', ``, 'string') }}",
								value:
									"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Value', ``, 'string') }}",
							},
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
							{ name: 'Content-Type', value: 'application/json' },
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-2752, -336],
				name: 'Create topic',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url', 'Update a topic name.', 'string', 'https://classroom.googleapis.com/v1/courses/{courseId}/topics/{topicId}?updateMask=name') }}",
					method: 'PATCH',
					options: {},
					sendBody: true,
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Name', ``, 'string') }}",
								value:
									"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Value', ``, 'string') }}",
							},
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
							{
								name: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters1_Name', ``, 'string') }}",
								value:
									"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters1_Value', ``, 'string') }}",
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-2512, -336],
				name: 'Patch topic',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url', 'Delete a topic.', 'string', 'https://classroom.googleapis.com/v1/courses/{courseId}/topics/{topicId}') }}",
					method: 'DELETE',
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-2624, -336],
				name: 'Delete topic',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url', 'List teachers in a course.', 'string', 'https://classroom.googleapis.com/v1/courses/{courseId}/teachers') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-2144, -400],
				name: 'List teachers',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agentTool',
			version: 2.2,
			config: {
				parameters: {
					text: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Prompt__User_Message_', ``, 'string') }}",
					options: {
						systemMessage:
							'You are Teacher_Agent. Available tools:\n\nList teachers: lists all teachers in a course\n\nGet teacher: retrieves a specific teacher by ID',
					},
				},
				position: [-2336, -688],
				name: 'Teacher agent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url', 'Get a specific teacher.', 'string', 'https://classroom.googleapis.com/v1/courses/{courseId}/teachers/{userId}') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-2032, -384],
				name: 'Get teacher',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url', 'List students in a course.', 'string', 'https://classroom.googleapis.com/v1/courses/{courseId}/students') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-1632, -384],
				name: 'List students',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agentTool',
			version: 2.2,
			config: {
				parameters: {
					text: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Prompt__User_Message_', ``, 'string') }}",
					options: {
						systemMessage:
							'You are Students_Agent. Available tools:\n\nList students: lists all students in a course\n\nGet student: retrieves a specific student by ID',
					},
				},
				position: [-2096, -688],
				name: 'Students Agent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url', 'Get a specific student.', 'string', 'https://classroom.googleapis.com/v1/courses/{courseId}/students/{userId}') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-1488, -352],
				name: 'Get student',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url', 'Get add-on context for a post.', 'string', 'https://classroom.googleapis.com/v1/courses/{courseId}/posts/{postId}/addOnContext') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-1088, -336],
				name: 'Get post add-on context',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agentTool',
			version: 2.2,
			config: {
				parameters: {
					text: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Prompt__User_Message_', ``, 'string') }}",
					options: {
						systemMessage:
							'You are Course_Post_Agent, an AI assistant specialized in managing Google Classroom post attachments and their submissions via the Classroom REST v1 API. Invoke exactly the tool that matches the user’s request:\n\nGet post add-on context\n– Input: postId\n– Returns: the AddOnContext resource for the specified post\n\nList post add-on attachments\n– Input: postId\n– Returns: an array of AddOnAttachment resources for the specified post\n\nGet post add-on attachment\n– Input: postId, attachmentId\n– Returns: the specified AddOnAttachment resource\n\nGet post attachment submission\n– Input: postId, attachmentId, submissionId\n– Returns: the StudentSubmission resource for the specified attachment',
					},
				},
				position: [-1152, -704],
				name: 'Course Post Agent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url', 'List add-on attachments for a post.', 'string', 'https://classroom.googleapis.com/v1/courses/{courseId}/posts/{postId}/addOnAttachments') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-960, -336],
				name: 'List post add-on attachments',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url', 'Get a specific add-on attachment.', 'string', 'https://classroom.googleapis.com/v1/courses/{courseId}/posts/{postId}/addOnAttachments/{attachmentId}') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-832, -336],
				name: 'Get post add-on attachment',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url', 'Get a student submission for a post add-on attachment.', 'string', 'https://classroom.googleapis.com/v1/courses/{courseId}/posts/{postId}/addOnAttachments/{attachmentId}/studentSubmissions/{submissionId}') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-704, -336],
				name: 'Get post attachment submission',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url','Create an announcement.','string','https://classroom.googleapis.com/v1/courses/{courseId}/announcements') }}",
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Name', ``, 'string') }}",
								value:
									"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Value', ``, 'string') }}",
							},
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
							{
								name: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters1_Name', ``, 'string') }}",
								value:
									"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters1_Value', ``, 'string') }}",
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-64, -336],
				name: 'Create announcement',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agentTool',
			version: 2.2,
			config: {
				parameters: {
					text: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Prompt__User_Message_', ``, 'string') }}",
					options: {
						systemMessage:
							'You are Announcements_Agent, an AI assistant specialized in managing Google Classroom announcements via the Classroom REST v1 API. Invoke exactly the tool that matches the user’s request:\n\nList announcements\n– Inputs: courseId\n– Returns: an array of Announcement resources\n\nGet announcement\n– Inputs: courseId, announcementId\n– Returns: the specified Announcement resource\n\nCreate announcement\n– Inputs: courseId, JSON body with Announcement fields (text, state, etc.)\n– Returns: the newly created Announcement resource\n\nPatch announcement\n– Inputs: courseId, announcementId, updateMask specifying fields to update, JSON body with updated values\n– Returns: the updated Announcement resource\n\nDelete announcement\n– Inputs: courseId, announcementId\n– Returns: empty response on success\n\nGet announcement add-on context\n– Inputs: courseId, announcementId\n– Returns: the AddOnContext resource for the specified announcement',
					},
				},
				position: [-240, -592],
				name: 'Announcements Agent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url','Delete an announcement.','string','https://classroom.googleapis.com/v1/courses/{courseId}/announcements/{announcementId}') }}",
					method: 'DELETE',
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [320, -336],
				name: 'Delete announcement',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url','Get an announcement.','string','https://classroom.googleapis.com/v1/courses/{courseId}/announcements/{announcementId}') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [192, -336],
				name: 'Get announcement',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url','Get announcement add-on context.','string','https://classroom.googleapis.com/v1/courses/{courseId}/announcements/{announcementId}/addOnContext') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [64, -336],
				name: 'Get announcement add-on context',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url','List announcements.','string','https://classroom.googleapis.com/v1/courses/{courseId}/announcements') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-320, -336],
				name: 'List announcements',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url','Update announcement text.','string','https://classroom.googleapis.com/v1/courses/{courseId}/announcements/{announcementId}?updateMask=text') }}",
					method: 'PATCH',
					options: {},
					sendBody: true,
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Name', ``, 'string') }}",
								value:
									"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Value', ``, 'string') }}",
							},
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
							{ name: 'Content-Type', value: 'application/json' },
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [-192, -336],
				name: 'Patch announcement',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url','Get course details.','string','https://classroom.googleapis.com/v1/courses/{courseId}') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [832, -336],
				name: 'Get course',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agentTool',
			version: 2.2,
			config: {
				parameters: {
					text: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Prompt__User_Message_', ``, 'string') }}",
					options: {
						systemMessage:
							'You are Course Management Agent, a focused controller for Google Classroom course data; call only the tools listed below and validate required inputs before invocation.\n\nList courses\n\nInputs: none\n\nReturns: array of Course resources\n\nGet course\n\nInputs: courseId\n\nReturns: Course resource\n\nGet grading period settings\n\nInputs: courseId\n\nReturns: GradingPeriodSettings resource',
					},
				},
				position: [640, -576],
				name: 'Course Management Agent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url','Get grading period settings.','string','https://classroom.googleapis.com/v1/courses/{courseId}/gradingPeriodSettings') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [704, -336],
				name: 'Get grading period settings',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url','List all courses.','string','https://classroom.googleapis.com/v1/courses') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [960, -336],
				name: 'List courses',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url','Get coursework.','string','https://classroom.googleapis.com/v1/courses/{courseId}/courseWork/{courseWorkId}') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [1632, -320],
				name: 'Get coursework',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agentTool',
			version: 2.2,
			config: {
				parameters: {
					text: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Prompt__User_Message_', ``, 'string') }}",
					options: {
						systemMessage:
							'ou are Coursework Management Agent. Use only the tools shown for this node and validate required inputs before calling.\n\nList coursework: Inputs: courseId. Returns: array of CourseWork resources.\n\nGet coursework: Inputs: courseId, courseWorkId. Returns: a CourseWork resource.\n\nGet coursework add-on context: Inputs: courseId, courseWorkId. Returns: AddOnContext for the coursework.',
					},
				},
				position: [1296, -544],
				name: 'Coursework Management SubAgent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url','Get coursework add-on context.','string','https://classroom.googleapis.com/v1/courses/{courseId}/courseWork/{courseWorkId}/addOnContext') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [1488, -320],
				name: 'Get coursework add-on context',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('url','List coursework.','string','https://classroom.googleapis.com/v1/courses/{courseId}/courseWork') }}",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer {{$credentials.oauth2.access_token}}',
							},
						],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [1360, -320],
				name: 'List coursework',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-3264, -368],
				name: 'Google Gemini Chat Model3',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1.3,
			config: {
				parameters: { contextWindowLength: 10 },
				position: [-3136, -352],
				name: 'Simple Memory3',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-2384, -400],
				name: 'Google Gemini Chat Model4',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1.3,
			config: {
				parameters: { contextWindowLength: 10 },
				position: [-2272, -400],
				name: 'Simple Memory4',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-1888, -384],
				name: 'Google Gemini Chat Model5',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1.3,
			config: {
				parameters: { contextWindowLength: 10 },
				position: [-1760, -384],
				name: 'Simple Memory5',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-1344, -336],
				name: 'Google Gemini Chat Model7',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1.3,
			config: {
				parameters: { contextWindowLength: 20 },
				position: [-1216, -336],
				name: 'Simple Memory7',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-576, -336],
				name: 'Google Gemini Chat Model8',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1.3,
			config: {
				parameters: { contextWindowLength: 10 },
				position: [-448, -336],
				name: 'Simple Memory8',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [448, -336],
				name: 'Google Gemini Chat Model10',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1.3,
			config: {
				parameters: { contextWindowLength: 10 },
				position: [576, -336],
				name: 'Simple Memory10',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [1088, -352],
				name: 'Google Gemini Chat Model12',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1.3,
			config: {
				parameters: { contextWindowLength: 10 },
				position: [1232, -336],
				name: 'Simple Memory12',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-2336, -1344],
				name: 'Google Gemini Chat Model18',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1.3,
			config: {
				parameters: { contextWindowLength: 100 },
				position: [-2160, -1280],
				name: 'Simple Memory18',
			},
		}),
	)
	.add(
		sticky(
			"🗂️ Course Topic Agent Overview\n\n\nOperations:\n• List Topics - Retrieve all topics for a course\n• Get Topic - Fetch details of a specific topic\n• Create Topic - Add a new topic to a course\n• Patch Topic - Update an existing topic's details\n• Delete Topic - Remove a topic from a course\n\n",
			{ color: 7, position: [-2848, -880], width: 416, height: 288 },
		),
	)
	.add(
		sticky(
			'👩‍🏫 Teacher & 👨‍🎓 Student Agents Overview\n\n\nOperations:\n• List Teachers/Students - Retrieve all teachers or students in a course\n• Get Teacher/Student - Fetch details of an individual participant\n\n',
			{ name: 'Sticky Note2', color: 7, position: [-2336, -912], width: 496, height: 416 },
		),
	)
	.add(
		sticky(
			"📢 Announcement Agent Overview\n\nOperations:\n• List Announcements - Retrieve all announcements in a course\n• Get Announcement Details - Fetch information about a specific announcement\n• Create Announcement - Post a new announcement to the course\n• Patch Announcement - Update an existing announcement's content or context\n• Delete Announcement - Remove an announcement from the course",
			{ name: 'Sticky Note3', color: 7, position: [-320, -864], width: 400, height: 368 },
		),
	)
	.add(
		sticky(
			'📬 Course Post Agent Overview\n\n\nOperations:\n• List Posts - Retrieve all posts in a course\n• Get Post Details - Fetch information about a specific post\n• Get Attachments - Retrieve all board attachments or related files for a post\n• Get Submission Data - Collect all submission details associated with a post',
			{ name: 'Sticky Note4', color: 7, position: [-1216, -928], width: 368, height: 320 },
		),
	)
	.add(
		sticky(
			'🏫 Course Management Agent Overview\n\nOperations:\n• List Courses - Retrieve all available courses for the authenticated user\n• Get Course Details - Fetch complete information about a specific course\n• Get Grading Period Data - Retrieve grading period information and related course performance data\n\n',
			{ name: 'Sticky Note5', color: 7, position: [528, -784], width: 480, height: 288 },
		),
	)
	.add(
		sticky(
			'🧾 Coursework Management Agent Overview\n\nOperations:\n• List Coursework - Retrieve all coursework items for a specific course\n• Get Coursework Details - Fetch information about an individual coursework\n• Get Coursework with Context - Retrieve coursework along with its attached content, instructions, and related data\n',
			{ name: 'Sticky Note6', color: 7, position: [1184, -736], width: 464, height: 272 },
		),
	)
	.add(
		sticky(
			'🎓Automate Google Classroom: Topics,Assignments   & Student Tracking\n\nAutomate Google Classroom via n8n: courses, topics, teachers, students, announcements, and coursework.\n\n🔐 Authentication Setup\nOAuth 2.0 required. Enable Google Classroom API in OAuth consent screen. Connect credentials in n8n. Webhook included for external triggers.\n\n🧠 Agents Included\n\n🗂️ Course Topic Agent - Manage topics: List, Get, Create, Patch, Delete\n\n👩‍🏫 Teacher & 👨‍🎓 Student Agents - Manage participants: List all or individual teachers/students\n\n📬 Course Post Agent - Handle posts: List, Get details, attachments, submissions\n\n📢 Announcement Agent - Manage announcements: List, Get, Create, Patch, Delete\n\n🏫 Course Management Agent - Manage courses: List, Get details, grading periods\n\n🧾 Coursework Management Agent - Manage coursework: List, Get details, Get with context\n\n💡 With OAuth connected, fully automate classroom management. Extend with webhooks for live interactions.\n',
			{ name: 'Sticky Note1', color: 4, position: [-1696, -2160], width: 432, height: 816 },
		),
	);
