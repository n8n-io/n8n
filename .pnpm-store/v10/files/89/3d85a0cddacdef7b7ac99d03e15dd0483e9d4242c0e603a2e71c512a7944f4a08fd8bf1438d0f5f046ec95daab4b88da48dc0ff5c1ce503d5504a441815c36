import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env["MISTRAL_API_KEY"];
if (!apiKey) {
  throw new Error("missing MISTRAL_API_KEY environment variable");
}

const client = new Mistral({ apiKey });

const requests = Array.from({ length: 5 }, (_, i) => ({
  customId: String(i),
  body: {
    model: "mistral-medium-latest",
    messages: [
      {
        role: "user",
        content: `What's i + ${i}`,
      },
    ],
  },
}));

let job = await client.batch.jobs.create({
  requests,
  model: "mistral-small-latest",
  endpoint: "/v1/chat/completions",
  metadata: { job_type: "testing" },
});

console.log(`Created job with ID: ${job.id}`);

const terminalStatuses = new Set([
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "TIMEOUT_EXCEEDED",
]);

while (!terminalStatuses.has(job.status)) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  job = await client.batch.jobs.get({ jobId: job.id });
  console.log(`Job status: ${job.status}`);
}

console.log(`Job is done, status ${job.status}`);

if (job.outputs && job.outputs.length > 0) {
  for (const output of job.outputs) {
    const response = output["response"] as { body?: unknown } | undefined;
    if (response?.body !== undefined) {
      console.log(response.body);
    } else {
      console.log(output);
    }
  }
}

if (job.errorFile) {
  console.log(`Error file ID: ${job.errorFile}`);
}
