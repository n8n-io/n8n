# AWS S3 Setup

n8n can use AWS S3 as an object store for binary data produced by workflow executions.

Binary data is written to your n8n S3 bucket in this format:

```
workflows/{workflowId}/executions/{executionId}/binary_data/{binaryFileId}
```

Follow these instructions to set up an AWS S3 bucket as n8n's object store.

## Create a bucket

1. With your root user, [sign in](https://signin.aws.amazon.com/signin) to the AWS Management Console.

2. Go to `S3` > `Create Bucket`. Name the bucket and select a region, ideally one close to your instance. Scroll to the bottom and `Create bucket`. Make a note of the bucket name and region.

## Create a policy for the bucket

3. Go to `IAM` > `Policies` > `Create Policy`. Select the `JSON` tab and paste the following policy. Replace `<bucket-name>` with the name of the bucket you created in step 2. Click on `Next`.

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "VisualEditor0",
			"Effect": "Allow",
			"Action": ["s3:*"],
			"Resource": ["arn:aws:s3:::<bucket-name>", "arn:aws:s3:::<bucket-name>/*"]
		}
	]
}
```

4. Name the policy, scroll to the bottom, and `Create policy`. Make a note of the policy name.

## Create a user and attach the policy to them

5. Go to `IAM` > `Users` > `Create user`.

6. Name the user and enable `Provide user with access to the AWS Management Console`, then `I want to create an IAM user` and `Next`.

7. Click on `Attach policies directly`, then search and tick the checkbox for the policy you created in step 4. Click on `Next` and then `Create user`. Download the CSV with the user name, password, and console sign-in link.

8. Click on `Return to users list`, access the user you just created, and select the `Security credentials` tab. Scroll down to the `Access key` section and click on `Create access key`. Select `Third-party service` or `Application running outside AWS` and `Next`. Click on `Create access key`. Download the CSV with the access key ID and secret access key. Click on `Done`.

## Configure n8n to use S3

9. Set these environment variables using the bucket name and region from step 2.

```sh
export N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME=...
export N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION=...
```

Set these environment variables using the credentials from step 8.

```sh
export N8N_EXTERNAL_STORAGE_S3_ACCOUNT_ID=...
export N8N_EXTERNAL_STORAGE_S3_SECRET_KEY=...
```

Configure n8n to store binary data in S3.

```sh
export N8N_AVAILABLE_BINARY_DATA_MODES=filesystem,s3
export N8N_DEFAULT_BINARY_DATA_MODE=s3
export N8N_EXTERNAL_STORAGE_S3_HOST=...
```

Examples of valid hosts:

- `s3.us-east-1.amazonaws.com`
- `s3.us-east-005.backblazeb2.com`
- `dde5a538e0ffa1b202a3ddf2f20022b0.r2.cloudflarestorage.com`

10. Activate an [Enterprise license key](https://docs.n8n.io/enterprise-key/) for your instance.

## Usage notes

- To inspect binary data in the n8n S3 bucket...
  - You can use the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html) with your access key ID and secret access key.
  - You can also access the S3 section in the AWS Management Console with the details from step 7.
  - You can query the AWS S3 API using n8n's AWS S3 node.
- If your license key has expired and you remain on S3 mode, the instance will be able to read from, but not write to, the S3 bucket.
- If your instance stored data in S3 and was later switched to filesystem mode, the instance will continue to read any data that was stored in S3, as long as `s3` remains listed in `N8N_AVAILABLE_BINARY_DATA_MODES` and as long as your S3 credentials remain valid.
- At this time, binary data pruning is based on the active binary data mode. For example, if your instance stored data in S3 and was later switched to filesystem mode, only binary data in the filesystem will be pruned. This may change in future.
