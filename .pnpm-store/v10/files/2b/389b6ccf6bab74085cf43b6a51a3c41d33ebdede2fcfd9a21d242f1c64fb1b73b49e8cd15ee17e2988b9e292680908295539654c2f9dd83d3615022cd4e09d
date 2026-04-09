---
title: Multistep Interfaces
description: Concepts behind building multistep interfaces
---

# Multistep Interfaces

Multistep interfaces refer to user interfaces that require multiple independent steps to be executed in order to complete a specific task.

In order to understand multistep interfaces, it is important to understand two concepts:

- Tool composition
- Application context

**Tool composition** is the process of combining multiple [tools](/docs/ai-sdk-core/tools-and-tool-calling) to create a new tool. This is a powerful concept that allows you to break down complex tasks into smaller, more manageable steps.

**Application context** refers to the state of the application at any given point in time. This includes the user's input, the output of the language model, and any other relevant information.

When designing multistep interfaces, you need to consider how the tools in your application can be composed together to form a coherent user experience as well as how the application context changes as the user progresses through the interface.

## Application Context

The application context can be thought of as the conversation history between the user and the language model. The richer the context, the more information the model has to generate relevant responses.

In the context of multistep interfaces, the application context becomes even more important. This is because **the user's input in one step may affect the output of the model in the next step**.

For example, consider a meal logging application that helps users track their daily food intake. The language model is provided with the following tools:

- `log_meal` takes in parameters like the name of the food, the quantity, and the time of consumption to log a meal.
- `delete_meal` takes in the name of the meal to be deleted.

When the user logs a meal, the model generates a response confirming the meal has been logged.

```txt highlight="2"
User: Log a chicken shawarma for lunch.
Tool: log_meal("chicken shawarma", "250g", "12:00 PM")
Model: Chicken shawarma has been logged for lunch.
```

Now when the user decides to delete the meal, the model should be able to reference the previous step to identify the meal to be deleted.

```txt highlight="7"
User: Log a chicken shawarma for lunch.
Tool: log_meal("chicken shawarma", "250g", "12:00 PM")
Model: Chicken shawarma has been logged for lunch.
...
...
User: I skipped lunch today, can you update my log?
Tool: delete_meal("chicken shawarma")
Model: Chicken shawarma has been deleted from your log.
```

In this example, managing the application context is important for the model to generate the correct response. The model needs to have information about the previous actions in order for it to use generate the parameters for the `delete_meal` tool.

## Tool Composition

Tool composition is the process of combining multiple tools to create a new tool. This involves defining the inputs and outputs of each tool, as well as how they interact with each other.

The design of how these tools can be composed together to form a multistep interface is crucial to both the user experience of your application and the model's ability to generate the correct output.

For example, consider a flight booking assistant that can help users book flights. The assistant can be designed to have the following tools:

- `searchFlights`: Searches for flights based on the user's query.
- `lookupFlight`: Looks up details of a specific flight based on the flight number.
- `bookFlight`: Books a flight based on the user's selection.

The `searchFlights` tool is called when the user wants to lookup flights for a specific route. This would typically mean the tool should be able to take in parameters like the origin and destination of the flight.

The `lookupFlight` tool is called when the user wants to get more details about a specific flight. This would typically mean the tool should be able to take in parameters like the flight number and return information about seat availability.

The `bookFlight` tool is called when the user decides to book a flight. In order to identify the flight to book, the tool should be able to take in parameters like the flight number, trip date, and passenger details.

So the conversation between the user and the model could look like this:

```txt highlight="8"
User: I want to book a flight from New York to London.
Tool: searchFlights("New York", "London")
Model: Here are the available flights from New York to London.
User: I want to book flight number BA123 on 12th December for myself and my wife.
Tool: lookupFlight("BA123") -> "4 seats available"
Model: Sure, there are seats available! Can you provide the names of the passengers?
User: John Doe and Jane Doe.
Tool: bookFlight("BA123", "12th December", ["John Doe", "Jane Doe"])
Model: Your flight has been booked!
```

In the last tool call, the `bookFlight` tool does not include passenger details as it is not available in the application context. As a result, it requests the user to provide the passenger details before proceeding with the booking.

Looking up passenger information could've been another tool that the model could've called before calling the `bookFlight` tool assuming that the user is logged into the application. This way, the model does not have to ask the user for the passenger details and can proceed with the booking.

```txt highlight="5,6"
User: I want to book a flight from New York to London.
Tool: searchFlights("New York", "London")
Model: Here are the available flights from New York to London.
User: I want to book flight number BA123 on 12th December for myself and my wife.
Tool: lookupContacts() -> ["John Doe", "Jane Doe"]
Tool: bookFlight("BA123", "12th December", ["John Doe", "Jane Doe"])
Model: Your flight has been booked!
```

The `lookupContacts` tool is called before the `bookFlight` tool to ensure that the passenger details are available in the application context when booking the flight. This way, the model can reduce the number of steps required from the user and use its ability to call tools that populate its context and use that information to complete the booking process.

Now, let's introduce another tool called `lookupBooking` that can be used to show booking details by taking in the name of the passenger as parameter. This tool can be composed with the existing tools to provide a more complete user experience.

```txt highlight="2-4"
User: What's the status of my wife's upcoming flight?
Tool: lookupContacts() -> ["John Doe", "Jane Doe"]
Tool: lookupBooking("Jane Doe") -> "BA123 confirmed"
Tool: lookupFlight("BA123") -> "Flight BA123 is scheduled to depart on 12th December."
Model: Your wife's flight BA123 is confirmed and scheduled to depart on 12th December.
```

In this example, the `lookupBooking` tool is used to provide the user with the status of their wife's upcoming flight. By composing this tool with the existing tools, the model is able to generate a response that includes the booking status and the departure date of the flight without requiring the user to provide additional information.

As a result, the more tools you design that can be composed together, the more complex and powerful your application can become.
