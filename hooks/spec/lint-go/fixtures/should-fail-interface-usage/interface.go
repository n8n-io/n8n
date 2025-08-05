package main

import "fmt"

// ProcessData uses interface{} which is forbidden
func ProcessData(data interface{}) {
	fmt.Printf("Processing: %v\n", data)
}

// Also uses the 'any' type which is forbidden
func HandleAny(value any) {
	fmt.Printf("Handling: %v\n", value)
}

func main() {
	ProcessData("hello")
	ProcessData(123)
	HandleAny(true)
}
