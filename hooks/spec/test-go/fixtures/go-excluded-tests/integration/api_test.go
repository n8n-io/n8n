package integration

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAPIClientGetUser(t *testing.T) {
	// This is an integration test that makes HTTP calls
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/users/123" {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"id": "123", "name": "Test User"}`))
		} else {
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	client := NewAPIClient(server.URL)

	t.Run("existing user", func(t *testing.T) {
		data, err := client.GetUser("123")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if data == "" {
			t.Error("expected data, got empty string")
		}
	})

	t.Run("non-existing user", func(t *testing.T) {
		_, err := client.GetUser("999")
		if err == nil {
			t.Error("expected error for non-existing user")
		}
	})
}

func TestAPIClientPostData(t *testing.T) {
	// This is an integration test that makes HTTP calls
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			w.WriteHeader(http.StatusCreated)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	defer server.Close()

	client := NewAPIClient(server.URL)

	err := client.PostData("data", []byte(`{"key": "value"}`))
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestIntegrationDatabaseConnection(t *testing.T) {
	// This would be a database integration test
	t.Log("This is a database integration test that should be excluded")

	// Simulate database connection test
	if testing.Short() {
		t.Skip("skipping database integration test in short mode")
	}

	// Test would connect to real database here
	t.Log("Testing database connection...")
}
