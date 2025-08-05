package server

import (
	"fmt"
	"net/http"

	"github.com/test/go-nested-packages/pkg/models"
)

// Server represents an HTTP server
type Server struct {
	addr    string
	handler http.Handler
}

// New creates a new server instance
func New(addr string) *Server {
	mux := http.NewServeMux()

	// Setup routes
	mux.HandleFunc("/users", handleUsers)
	mux.HandleFunc("/health", handleHealth)

	return &Server{
		addr:    addr,
		handler: mux,
	}
}

// Start starts the HTTP server
func (s *Server) Start() error {
	fmt.Printf("Server starting on %s\n", s.addr)
	return http.ListenAndServe(s.addr, s.handler)
}

// GetAddress returns the server address
func (s *Server) GetAddress() string {
	return s.addr
}

func handleUsers(w http.ResponseWriter, r *http.Request) {
	user := models.User{
		ID:    1,
		Name:  "Test User",
		Email: "test@example.com",
	}

	fmt.Fprintf(w, "User: %+v\n", user)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "OK")
}
