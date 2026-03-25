import { v4 as uuidv4 } from "uuid";
import { ZepClient } from "../../src";
import { CreateUserRequest, UpdateUserRequest } from "../../src/api";

async function main() {
    const projectApiKey = process.env.ZEP_API_KEY;

    const client = new ZepClient({
        apiKey: projectApiKey,
    });

    // Create multiple users
    for (let i = 0; i < 3; i++) {
        const userId = uuidv4();
        const userRequest: CreateUserRequest = {
            userId: userId,
            email: `user${i}@example.com`,
            firstName: `John${i}`,
            lastName: `Doe${i}`,
            metadata: { foo: "bar" },
        };

        try {
            const user = await client.user.add(userRequest);
            console.log(`Created user ${i + 1}: ${user.userId}`);
        } catch (e) {
            console.log(`Failed to create user ${i + 1}: ${e}`);
        }
    }

    // Update the first user
    const firstUser = (await client.user.listOrdered())?.users?.[0];
    if (!firstUser) {
        console.log("No user found");
        return;
    }
    const userId = firstUser.userId;
    const userRequest: UpdateUserRequest = {
        email: "updated_user@example.com",
        firstName: "UpdatedJohn",
        lastName: "UpdatedDoe",
        metadata: { foo: "updated_bar" },
    };

    try {
        if (!userId) {
            throw new Error("No user found");
        }
        const updatedUser = await client.user.update(userId, userRequest);
        console.log(`Updated user: ${updatedUser}`);
    } catch (e) {
        console.log(`Failed to update user: ${e}`);
    }

    // Delete the second user
    const userIdToDelete = (await client.user.listOrdered())?.users?.[1]?.userId;
    try {
        if (!userIdToDelete) {
            throw new Error("No user found");
        }
        await client.user.delete(userIdToDelete);
        console.log(`Deleted user: ${userIdToDelete}`);
    } catch (e) {
        console.log(`Failed to delete user: ${e}`);
    }

    // List all users
    try {
        console.log("All users:");
        const usersResult = await client.user.listOrdered({ pageSize: 10, pageNumber: 1 });
        if (usersResult && usersResult.users) {
            for (const user of usersResult.users) {
                console.log(user.userId);
            }
        }
    } catch (e) {
        console.log(`Failed to list users: ${e}`);
    }
}

main();
